"use server";

import { db } from "@/db";
import { events, eventRevenues } from "@/db/schema/events";
import { eventParticipants } from "@/db/schema/event-participants";
import { shopExpenses, eventExpenseSplits } from "@/db/schema/expenses";
import { transactions } from "@/db/schema/transactions";
import { eq, desc, and, sql } from "drizzle-orm";
import { verifySession } from "@/lib/session";

export async function getShopEvents(shopId: string) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	return await db.query.events.findMany({
		where: eq(events.shopId, shopId),
		orderBy: [desc(events.startDate)],
	});
}

export async function getEvent(eventId: string) {
	return await db.query.events.findFirst({
		where: eq(events.id, eventId),
		with: {
			products: true,
			revenues: {
				with: { issuer: true },
				orderBy: [desc(eventRevenues.date)],
			},
			expenses: {
				with: { issuer: true },
				orderBy: [desc(shopExpenses.date)],
			},
			expenseSplits: {
				with: {
					expense: {
						with: { issuer: true },
					},
				},
			},
			participants: {
				with: {
					user: true,
				},
				orderBy: [desc(eventParticipants.joinedAt)],
			},
		},
	});
}

export async function getEventStats(eventId: string) {
	const event = await db.query.events.findFirst({
		where: eq(events.id, eventId),
		with: {
			participants: true,
			products: true,
		},
	});

	if (!event) return null;

	// 1. Calculate Expenses
	const directExpensesResult = await db
		.select({ total: sql<number>`sum(${shopExpenses.amount})` })
		.from(shopExpenses)
		.where(eq(shopExpenses.eventId, eventId));

	const splitExpensesResult = await db
		.select({ total: sql<number>`sum(${eventExpenseSplits.amount})` })
		.from(eventExpenseSplits)
		.where(eq(eventExpenseSplits.eventId, eventId));

	const totalExpenses =
		Number(directExpensesResult[0]?.total || 0) +
		Number(splitExpensesResult[0]?.total || 0);

	// 2. Calculate Revenue
	let totalRevenue = 0;

	const manualRevenuesResult = await db
		.select({ total: sql<number>`sum(${eventRevenues.amount})` })
		.from(eventRevenues)
		.where(eq(eventRevenues.eventId, eventId));

	totalRevenue += Number(manualRevenuesResult[0]?.total || 0);

	if (event.type === "SHARED_COST") {
		const acompteResult = await db
			.select({ total: sql<number>`sum(${transactions.amount})` })
			.from(transactions)
			.where(
				and(
					eq(transactions.eventId, eventId),
					eq(transactions.type, "PURCHASE")
				)
			);
		totalRevenue += -Number(acompteResult[0]?.total || 0);
	} else if (event.type === "COMMERCIAL") {
		const revenueResult = await db
			.select({ total: sql<number>`sum(${transactions.amount})` })
			.from(transactions)
			.where(
				and(
					eq(transactions.eventId, eventId),
					eq(transactions.type, "PURCHASE")
				)
			);
		totalRevenue += -Number(revenueResult[0]?.total || 0);
	}

	return {
		participantsCount: event.participants.length,
		revenue: totalRevenue,
		expenses: totalExpenses,
		profit: totalRevenue - totalExpenses,
	};
}

export async function getShopPublicEvents(shopId: string, userId?: string) {
	const allEvents = await db.query.events.findMany({
		where: and(eq(events.shopId, shopId), eq(events.status, "OPEN")),
		orderBy: [desc(events.startDate)],
		with: {
			participants: true,
		},
	});

	return allEvents.map((event) => {
		const isJoined = userId
			? event.participants.some((p) => p.userId === userId)
			: false;

		return {
			id: event.id,
			name: event.name,
			description: event.description,
			startDate: event.startDate,
			type: event.type,
			isJoined,
		};
	});
}

export async function getEnrolledEvents(userId: string) {
	const participations = await db.query.eventParticipants.findMany({
		where: eq(eventParticipants.userId, userId),
		with: {
			event: {
				with: {
					shop: true,
				},
			},
		},
		orderBy: [desc(eventParticipants.joinedAt)],
	});

	return participations.map((p) => ({
		...p.event,
		shop: p.event.shop,
	}));
}
