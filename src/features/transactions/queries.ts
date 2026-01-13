import { and, asc, desc, eq, gte, ilike, lte,or, sql } from "drizzle-orm";

import { transactions } from "@/db/schema";

export async function getTransactionsQuery(
    search = "", 
    type = "ALL", 
    sort = "DATE_DESC",
    limit?: number,
    offset?: number,
    startDate?: Date,
    endDate?: Date,
    eventId?: string
) {
    const whereConditions = [];

    // Search
    if (search) {
        whereConditions.push(
            or(
                // Search in description
                ilike(transactions.description, `%${search}%`),
                // Search in amount (approximate string match)
                sql`CAST(${transactions.amount} AS TEXT) ILIKE ${`%${search}%`}`,
            )
        );
    }

    // Filter by Type
    if (type !== "ALL") {
        whereConditions.push(eq(transactions.type, type as "PURCHASE" | "TRANSFER" | "TOPUP" | "ADJUSTMENT" | "REFUND"));
    }

    // Filter by Date
    if (startDate) {
        whereConditions.push(gte(transactions.createdAt, startDate));
    }
    if (endDate) {
        whereConditions.push(lte(transactions.createdAt, endDate));
    }

    // Filter by Event
    if (eventId) {
        whereConditions.push(eq(transactions.eventId, eventId));
    }

    // Sorting
    let orderByClause = [desc(transactions.createdAt)];
    if (sort === "DATE_ASC") orderByClause = [asc(transactions.createdAt)];
    if (sort === "AMOUNT_DESC") orderByClause = [desc(transactions.amount)];
    if (sort === "AMOUNT_ASC") orderByClause = [asc(transactions.amount)];

    	return {
		where: and(...whereConditions),
		orderBy: orderByClause,
		with: {
			shop: true,
			fams: true,
			product: true,
			issuer: true,
			receiverUser: true,
			targetUser: true,
		},
		limit: limit,
		offset: offset,
	};
}
