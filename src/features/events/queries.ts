"use server";

import { and, count, desc, eq, gte, inArray, notInArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { eventParticipants } from "@/db/schema/event-participants";
import { eventRevenues,events } from "@/db/schema/events";
import { eventExpenseSplits,shopExpenses } from "@/db/schema/expenses";
import { transactions } from "@/db/schema/transactions";
import { verifySession } from "@/lib/session";

export async function getShopEvents({
	shopId,
	page = 1,
	pageSize = 12,
	search = "",
	status,
}: {
	shopId: string;
	page?: number;
	pageSize?: number;
	search?: string;
	status?: string;
}) {
	const session = await verifySession();
	if (!session) throw new Error("Unauthorized");

	const offset = (page - 1) * pageSize;

	const whereConditions = [eq(events.shopId, shopId)];

	if (search) {
		whereConditions.push(sql`lower(${events.name}) LIKE ${`%${search.toLowerCase()}%`}`);
	}

	if (status === "ACTIVE") {
		whereConditions.push(
			inArray(events.status, ["DRAFT", "OPEN", "STARTED"])
		);
	} else if (status === "HISTORY") {
		whereConditions.push(
			inArray(events.status, ["CLOSED", "ARCHIVED"])
		);
	}

	const whereClause = and(...whereConditions);

	// Get Total Count
	const [countResult] = await db
		.select({ count: count() })
		.from(events)
		.where(whereClause);
	
	const totalItems = countResult.count;
	const totalPages = Math.ceil(totalItems / pageSize);

	// Get Data
	const data = await db.query.events.findMany({
		where: whereClause,
		orderBy: [desc(events.startDate)],
		limit: pageSize,
		offset: offset,
	});

	return {
		data,
		metadata: {
			totalItems,
			totalPages,
			currentPage: page,
			pageSize,
		},
	};
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
					inArray(transactions.type, ["PURCHASE", "REFUND"])
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
					inArray(transactions.type, ["PURCHASE", "REFUND"])
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

	return participations
		.map((p) => ({
			...p.event,
			shop: p.event.shop,
		}))
		.filter(
			(e) => e.status !== "CLOSED" && e.status !== "ARCHIVED" && e.status !== "DRAFT"
		);
}

export async function getUpcomingPublicEvents(userId: string) {
	// 1. Get IDs of events the user is already participating in
	const userParticipations = await db.query.eventParticipants.findMany({
		where: eq(eventParticipants.userId, userId),
		columns: { eventId: true },
	});

	const joinedEventIds = userParticipations.map((p) => p.eventId);

	// 2. Build where clause
	const whereClause = [
		eq(events.status, "OPEN"),
		eq(events.allowSelfRegistration, true),
	];

	if (joinedEventIds.length > 0) {
		whereClause.push(notInArray(events.id, joinedEventIds));
	}

	const upcomingEvents = await db.query.events.findMany({
		where: and(...whereClause),
		orderBy: [desc(events.startDate)],
		with: {
			shop: true,
			participants: true, // Needed to check count vs max
		},
	});

	// 3. Filter out full events manually if needed, or return all and let UI show "Full"
	// Let's return all and handle UI
	return upcomingEvents;
}
