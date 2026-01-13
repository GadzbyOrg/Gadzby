"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { eventParticipants } from "@/db/schema/event-participants";
import { events } from "@/db/schema/events";
import { transactions } from "@/db/schema/transactions";
import { users } from "@/db/schema/users";
import { checkShopPermission } from "@/features/shops/utils";
import { authenticatedAction } from "@/lib/actions";

import {
	importParticipantsListSchema,
	importParticipantsSchema,
	joinEventSchema,
	leaveEventSchema,
	updateParticipantSchema,
} from "../schemas";

export const joinEvent = authenticatedAction(
	joinEventSchema,
	async (data, { session }) => {
		const targetUserId = data.userId || session.userId;
		const event = await db.query.events.findFirst({
			where: eq(events.id, data.eventId),
		});

		if (!event) return { error: "Event not found" };

		if (event.type === "COMMERCIAL") {
			return {
				error:
					"Les inscriptions sont désactivées pour les événements commerciaux.",
			};
		}

		if (targetUserId === session.userId) {
			if (!event.allowSelfRegistration) {
				const authorized = await checkShopPermission(
					session.userId,
					session.permissions,
					event.shopId,
					"MANAGE_EVENTS"
				);
				if (!authorized) return { error: "Self-registration not allowed" };
			}
		} else {
			const authorized = await checkShopPermission(
				session.userId,
				session.permissions,
				event.shopId,
				"MANAGE_EVENTS"
			);
			if (!authorized) return { error: "Unauthorized to add other users" };
		}

		const existing = await db.query.eventParticipants.findFirst({
			where: and(
				eq(eventParticipants.eventId, data.eventId),
				eq(eventParticipants.userId, targetUserId)
			),
		});

		if (existing) return { success: "Already joined" };

		const acompte = event.acompte || 0;
		// Only charge if event is OPEN
		if (acompte > 0 && event.status === "OPEN") {
			const user = await db.query.users.findFirst({
				where: eq(users.id, targetUserId),
				columns: { balance: true, isAsleep: true },
			});

			if (!user) return { error: "User not found" };
			if (user.balance < acompte)
				return { error: "Solde insuffisant pour l'acompte" };
			if (user.isAsleep) return { error: "Compte désactivé" };

			await db.transaction(async (tx) => {
				await tx
					.update(users)
					.set({ balance: sql`${users.balance} - ${acompte}` })
					.where(eq(users.id, targetUserId));

				await tx.insert(transactions).values({
					amount: -acompte,
					type: "PURCHASE",
					walletSource: "PERSONAL",
					issuerId: session.userId,
					targetUserId: targetUserId,
					shopId: event.shopId,
					eventId: event.id,
					description: `Acompte événement: ${event.name}`,
					status: "COMPLETED",
				});

				await tx.insert(eventParticipants).values({
					eventId: data.eventId,
					userId: targetUserId,
					status: "APPROVED",
					weight: 1,
				});
			});
		} else {
			await db
				.insert(eventParticipants)
				.values({
					eventId: data.eventId,
					userId: targetUserId,
					status: "APPROVED",
					weight: 1,
				})
				.onConflictDoNothing();
		}

		revalidatePath(`/admin/shops/${event.shopId}/events/${data.eventId}`);
		return { success: "Joined successfully" };
	}
);

export const leaveEvent = authenticatedAction(
	leaveEventSchema,
	async (data, { session }) => {
		const targetUserId = data.userId || session.userId;
		const event = await db.query.events.findFirst({
			where: eq(events.id, data.eventId),
		});
		if (!event) return { error: "Event not found" };

		if (session.userId !== targetUserId) {
			const authorized = await checkShopPermission(
				session.userId,
				session.permissions,
				event.shopId,
				"MANAGE_EVENTS"
			);
			if (!authorized) return { error: "Unauthorized" };
		}

		await db
			.delete(eventParticipants)
			.where(
				and(
					eq(eventParticipants.eventId, data.eventId),
					eq(eventParticipants.userId, targetUserId)
				)
			);

		revalidatePath(`/admin/shops/${event.shopId}/events/${data.eventId}`);
		return { success: "Left event" };
	}
);

export const updateParticipant = authenticatedAction(
	updateParticipantSchema,
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

		await db
			.update(eventParticipants)
			.set({
				weight: data.weight,
				status: data.status,
			})
			.where(
				and(
					eq(eventParticipants.eventId, data.eventId),
					eq(eventParticipants.userId, data.userId)
				)
			);

		revalidatePath(`/admin/shops/${event.shopId}/events/${data.eventId}`);
		return { success: "Participant updated" };
	}
);

export const importParticipants = authenticatedAction(
	importParticipantsSchema,
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

		if (event.type === "COMMERCIAL") {
			return {
				error:
					"Impossible d'importer des participants pour un événement commercial.",
			};
		}

		let usersToImport: (typeof users.$inferSelect)[] = [];

		if (data.promss) {
			usersToImport = await db.query.users.findMany({
				where: eq(users.promss, data.promss),
			});
		} else if (data.bucque) {
			usersToImport = await db.query.users.findMany({
				where: eq(users.bucque, data.bucque),
			});
		}

		if (usersToImport.length > 0) {
			await db
				.insert(eventParticipants)
				.values(
					usersToImport.map((u) => ({
						eventId: data.eventId,
						userId: u.id,
						status: "APPROVED" as const,
						weight: 1,
					}))
				)
				.onConflictDoNothing();
		}

		revalidatePath(`/admin/shops/${event.shopId}/events/${data.eventId}`);
		return { success: `Imported ${usersToImport.length} users` };
	}
);

export const importParticipantsFromList = authenticatedAction(
	importParticipantsListSchema,
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

		if (event.type === "COMMERCIAL") {
			return {
				error:
					"Impossible d'importer des participants pour un événement commercial.",
			};
		}

		if (data.data.length === 0) return { success: "No data" };

		// Remove duplicates and empty strings
		const uniqueIdentifiers = Array.from(
			new Set(data.data.map((d) => d.identifier).filter(Boolean))
		);

		// Find users by username (num'ss + prom'ss)
		const usersFound = await db.query.users.findMany({
			where: inArray(users.username, uniqueIdentifiers),
		});

		if (usersFound.length > 0) {
			// Create map for weights
			const weightMap = new Map(
				data.data.map((d) => [d.identifier, d.weight || 1])
			);

			await db
				.insert(eventParticipants)
				.values(
					usersFound.map((u) => ({
						eventId: data.eventId,
						userId: u.id,
						status: "APPROVED" as const,
						weight: weightMap.get(u.username) || 1,
					}))
				)
				.onConflictDoNothing();
		}

		revalidatePath(`/admin/shops/${event.shopId}/events/${data.eventId}`);
		return { count: usersFound.length };
	}
);
