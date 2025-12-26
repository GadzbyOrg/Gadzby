"use server";

import { db } from "@/db";
import { eventRevenues } from "@/db/schema/events";
import { shopExpenses, eventExpenseSplits } from "@/db/schema/expenses";
import { shopUsers } from "@/db/schema/shops";
import { authenticatedAction } from "@/lib/actions";
import {
	createRevenueSchema,
	deleteRevenueSchema,
	linkExpenseSchema,
	unlinkExpenseSchema,
	splitExpenseSchema,
	deleteSplitSchema,
	shopIdSchema,
} from "../schemas";
import { hasShopPermission } from "@/features/shops/utils";
import { and, eq, isNull } from "drizzle-orm";
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

// Revenues
export const createEventRevenue = authenticatedAction(
	createRevenueSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db.insert(eventRevenues).values({
			eventId: data.eventId,
			shopId: data.shopId,
			description: data.description,
			amount: data.amount,
			issuerId: session.userId,
            date: new Date(),
		});

		revalidatePath(`/admin/shops/${data.shopId}/events/${data.eventId}`);
		return { success: "Revenue created" };
	}
);

export const deleteEventRevenue = authenticatedAction(
	deleteRevenueSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db.delete(eventRevenues).where(eq(eventRevenues.id, data.revenueId));

		revalidatePath(`/admin/shops/${data.shopId}/events/${data.eventId}`);
		return { success: "Revenue deleted" };
	}
);

// Expenses
export const getAvailableExpensesAction = authenticatedAction(
	shopIdSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		const expenses = await db.query.shopExpenses.findMany({
			where: and(
				eq(shopExpenses.shopId, data.shopId),
				isNull(shopExpenses.eventId)
			),
		});

		return { success: "Expenses retrieved", data: expenses };
	}
);

export const linkExpenseToEvent = authenticatedAction(
	linkExpenseSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db
			.update(shopExpenses)
			.set({ eventId: data.eventId })
			.where(eq(shopExpenses.id, data.expenseId));

		revalidatePath(`/admin/shops/${data.shopId}/events/${data.eventId}`);
		return { success: "Expense linked" };
	}
);

export const unlinkExpenseFromEvent = authenticatedAction(
	unlinkExpenseSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db
			.update(shopExpenses)
			.set({ eventId: null })
			.where(eq(shopExpenses.id, data.expenseId));

		revalidatePath(`/admin/shops/${data.shopId}/events/${data.eventId}`);
		return { success: "Expense unlinked" };
	}
);

export const splitExpense = authenticatedAction(
	splitExpenseSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db.insert(eventExpenseSplits).values({
			eventId: data.eventId,
			expenseId: data.expenseId,
			amount: data.amount,
		});

		revalidatePath(`/admin/shops/${data.shopId}/events/${data.eventId}`);
		return { success: "Expense split created" };
	}
);

export const deleteExpenseSplit = authenticatedAction(
	deleteSplitSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db
			.delete(eventExpenseSplits)
			.where(eq(eventExpenseSplits.id, data.splitId));

		revalidatePath(`/admin/shops/${data.shopId}/events/${data.eventId}`);
		return { success: "Split deleted" };
	}
);
