"use server";

import { db } from "@/db";
import { events } from "@/db/schema/events";
import { users } from "@/db/schema/users";
import { shopUsers } from "@/db/schema/shops";
import { shopExpenses } from "@/db/schema/expenses";
import { transactions } from "@/db/schema/transactions";
import { authenticatedAction } from "@/lib/actions";
import { settlementSchema } from "../schemas";
import { hasShopPermission } from "@/features/shops/utils";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Helper for permissions
async function checkShopPermission(
	userId: string,
	permissions: string[],
	shopId: string,
	action: "canManageProducts" | "canViewStats"
) {
	if (permissions.includes("ADMIN") || permissions.includes("MANAGE_SHOPS")) {
		return true;
	}

	const membership = await db.query.shopUsers.findFirst({
		where: and(eq(shopUsers.shopId, shopId), eq(shopUsers.userId, userId)),
		with: { shop: true },
	});

	if (!membership) return false;

	return hasShopPermission(
		membership.role as any,
		membership.shop.permissions,
		action
	);
}

// Logic extracted for preview reuse
async function calculateSettlement(eventId: string) {
	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
		with: {
			participants: { with: { user: true } },
		},
	});

	if (!event) return null;

	const expensesResult = await db
		.select({ total: sql<number>`sum(${shopExpenses.amount})` })
		.from(shopExpenses)
		.where(eq(shopExpenses.eventId, eventId));

	const totalExpenses = expensesResult[0]?.total || 0;

	const totalWeight = event.participants.reduce(
		(sum, p) => sum + (p.weight || 1),
		0
	);

	const costPerUnit = totalWeight > 0 ? totalExpenses / totalWeight : 0;

	const breakdown = event.participants.map((p) => {
		const weight = p.weight || 1;
		const share = Math.round(costPerUnit * weight);
		const alreadyPaid = event.acompte || 0;

		const diff = alreadyPaid - share;

		return {
			userId: p.userId,
			username: p.user.username,
			name: `${p.user.prenom} ${p.user.nom}`,
			weight,
			share,
			alreadyPaid,
			diff,
		};
	});

	return {
		event, // Return event for caller
		totalExpenses,
		totalWeight,
		costPerUnit,
		breakdown,
	};
}

// Note: previewSettlement is often used as a read-only action, but it returns sensitive financial data.
// authenticatedAction is good here.
export const previewSettlement = authenticatedAction(
	settlementSchema,
	async (data, { session }) => {
		const calc = await calculateSettlement(data.eventId);
		if (!calc) return { error: "Event not found" };


        const authorized = await checkShopPermission(
            session.userId,
            session.permissions,
            calc.event.shopId,
            "canViewStats" 
        );
        
        const hasPerm = await checkShopPermission(
            session.userId,
            session.permissions,
            calc.event.shopId,
            "canViewStats" // or manage
        );
        if (!hasPerm) return { error: "Unauthorized" };

		return {
			totalExpenses: calc.totalExpenses,
			totalWeight: calc.totalWeight,
			costPerUnit: calc.costPerUnit,
			breakdown: calc.breakdown,
		};
	}
);

export const executeSettlement = authenticatedAction(
	settlementSchema,
	async (data, { session }) => {
		const calc = await calculateSettlement(data.eventId);
		if (!calc) return { error: "Event not found" };

		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			calc.event.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		const { breakdown, event } = calc;

		await db.transaction(async (tx) => {
			for (const item of breakdown) {
				if (item.diff === 0) continue;

				const isRefund = item.diff > 0;
				const amount = Math.abs(item.diff);

				if (isRefund) {
					await tx
						.update(users)
						.set({ balance: sql`${users.balance} + ${amount}` })
						.where(eq(users.id, item.userId));

					await tx.insert(transactions).values({
						amount: amount,
						type: "REFUND",
						walletSource: "PERSONAL",
						issuerId: session.userId,
						targetUserId: item.userId,
						shopId: event.shopId,
						description: `Remboursement événement: ${event.name}`,
						status: "COMPLETED",
					});
				} else {
					await tx
						.update(users)
						.set({ balance: sql`${users.balance} - ${amount}` })
						.where(eq(users.id, item.userId));

					await tx.insert(transactions).values({
						amount: -amount,
						type: "PURCHASE",
						walletSource: "PERSONAL",
						issuerId: session.userId,
						targetUserId: item.userId,
						shopId: event.shopId,
						description: `Régularisation événement: ${event.name}`,
						status: "COMPLETED",
					});
				}
			}

			await tx
				.update(events)
				.set({ status: "CLOSED" })
				.where(eq(events.id, data.eventId));
		});

		revalidatePath(`/admin/shops/${event.shopId}/events/${data.eventId}`);
		return { success: "Settlement executed" };
	}
);
