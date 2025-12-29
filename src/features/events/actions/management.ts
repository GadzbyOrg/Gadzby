"use server";

import { db } from "@/db";
import { events } from "@/db/schema/events";
import { users } from "@/db/schema/users";
import { products } from "@/db/schema/products";
import { transactions } from "@/db/schema/transactions";
import { authenticatedAction } from "@/lib/actions";
import {
	createEventSchema,
	updateEventSchema,
	eventActionSchema,
	eventIdSchema,
} from "../schemas";
import { checkShopPermission } from "@/features/shops/utils";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const createEvent = authenticatedAction(
	createEventSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"MANAGE_EVENTS"
		);
		if (!authorized) return { error: "Unauthorized" };

		const [newEvent] = await db
			.insert(events)
			.values({
				shopId: data.shopId,
				name: data.name,
				description: data.description,
				startDate: data.startDate,
				endDate: data.endDate,
				type: data.type,
				acompte: data.acompte || 0,
				allowSelfRegistration: data.allowSelfRegistration,
				status: "DRAFT",
			})
			.returning();

		revalidatePath(`/shops/${data.shopId}/manage/events`);
		return newEvent;
	}
);

export const updateEvent = authenticatedAction(
	updateEventSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"MANAGE_EVENTS"
		);
		if (!authorized) return { error: "Unauthorized" };

		const [updated] = await db
			.update(events)
			.set({
				name: data.name,
				description: data.description,
				startDate: data.startDate,
				endDate: data.endDate,
				type: data.type,
				acompte: data.acompte,
				allowSelfRegistration: data.allowSelfRegistration,
				status: data.status,
			})
			.where(eq(events.id, data.eventId))
			.returning();

		revalidatePath(`/shops/${data.shopId}/manage/events`);
		revalidatePath(`/shops/${data.shopId}/manage/events/${data.eventId}`);
		return updated;
	}
);

export const deleteEvent = authenticatedAction(
	eventActionSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"MANAGE_EVENTS"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db.delete(events).where(eq(events.id, data.eventId));
		revalidatePath(`/shops/${data.shopId}/manage/events`);
		return { success: "Event deleted" };
	}
);

export const activateEvent = authenticatedAction(
	eventActionSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"MANAGE_EVENTS"
		);
		if (!authorized) return { error: "Unauthorized" };

		const event = await db.query.events.findFirst({
			where: eq(events.id, data.eventId),
			with: { participants: true },
		});

		if (!event) return { error: "Event not found" };
		if (event.status !== "DRAFT")
			return { error: "Event is not in draft status" };

		const acompte = event.acompte || 0;

		// Logic for charging participants
		if (acompte > 0) {
			const participantsIds = event.participants.map((p) => p.userId);

			if (participantsIds.length > 0) {
				const paidTransactions = await db.query.transactions.findMany({
					where: and(
						eq(transactions.eventId, data.eventId),
						eq(transactions.type, "PURCHASE"),
						inArray(transactions.targetUserId, participantsIds)
					),
				});

				const paidUserIds = new Set(
					paidTransactions.map((t) => t.targetUserId)
				);
				const unpaidParticipants = event.participants.filter(
					(p) => !paidUserIds.has(p.userId)
				);

				let warningMessage: string | undefined;

				if (unpaidParticipants.length > 0) {
					const unpaidUserIds = unpaidParticipants.map((p) => p.userId);
					const usersData = await db.query.users.findMany({
						where: inArray(users.id, unpaidUserIds),
						columns: {
							id: true,
							balance: true,
							isAsleep: true,
							prenom: true,
							nom: true,
						},
					});

					const insufficientFundsUsers = usersData.filter(
						(u) => u.balance < acompte
					);

					if (insufficientFundsUsers.length > 0) {
						return {
							insufficientUsers: insufficientFundsUsers.map((u) => ({
								id: u.id,
								name: `${u.prenom} ${u.nom}`,
								balance: u.balance,
							})),
						};
					}

					await db.transaction(async (tx) => {
						for (const user of usersData) {
							await tx
								.update(users)
								.set({ balance: sql`${users.balance} - ${acompte}` })
								.where(eq(users.id, user.id));

							await tx.insert(transactions).values({
								amount: -acompte,
								type: "PURCHASE",
								walletSource: "PERSONAL",
								issuerId: session.userId,
								targetUserId: user.id,
								shopId: event.shopId,
								eventId: event.id,
								description: `Acompte événement: ${event.name}`,
								status: "COMPLETED",
							});
						}

						await tx
							.update(events)
							.set({ status: "OPEN" })
							.where(eq(events.id, data.eventId));
					});
				} else {
					await db
						.update(events)
						.set({ status: "OPEN" })
						.where(eq(events.id, data.eventId));
				}

				revalidatePath(`/shops/${data.shopId}/manage/events`);
				revalidatePath(`/shops/${data.shopId}/manage/events/${data.eventId}`);
				return { message: "Event activated", warning: warningMessage };
			} else {
				// No participants
				await db
					.update(events)
					.set({ status: "OPEN" })
					.where(eq(events.id, data.eventId));
			}
		} else {
			// No cost
			await db
				.update(events)
				.set({ status: "OPEN" })
				.where(eq(events.id, data.eventId));
		}

		revalidatePath(`/shops/${data.shopId}/manage/events`);
		revalidatePath(`/shops/${data.shopId}/manage/events/${data.eventId}`);
		return { message: "Event activated" };
	}
);

export const closeEvent = authenticatedAction(
	eventIdSchema,
	async (data, { session }) => {
		const event = await db.query.events.findFirst({
			where: eq(events.id, data.eventId),
		});
		if (!event) return { error: "Event not found" };

		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			event.shopId,
			"MANAGE_EVENTS"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db.transaction(async (tx) => {
			await tx
				.update(products)
				.set({ eventId: null })
				.where(eq(products.eventId, data.eventId));

			await tx
				.update(events)
				.set({ status: "CLOSED" })
				.where(eq(events.id, data.eventId));
		});

		revalidatePath(`/shops/${event.shopId}/manage/events/${data.eventId}`);
		return { success: "Event closed" };
	}
);
