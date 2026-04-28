import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { transactions, users } from "@/db/schema";

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
        const matchingUserIds = (await db
            .select({ id: users.id })
            .from(users)
            .where(
                or(
                    ilike(users.prenom, `%${search}%`),
                    ilike(users.nom, `%${search}%`),
                    ilike(users.username, `%${search}%`),
                    sql`concat(${users.prenom}, ' ', ${users.nom}) ILIKE ${`%${search}%`}`,
                    sql`concat(${users.nom}, ' ', ${users.prenom}) ILIKE ${`%${search}%`}`,
                )
            )).map((u) => u.id);

        whereConditions.push(
            or(
                ilike(transactions.description, `%${search}%`),
                sql`CAST(${transactions.amount} AS TEXT) ILIKE ${`%${search}%`}`,
                ...(matchingUserIds.length > 0
                    ? [
                        inArray(transactions.targetUserId, matchingUserIds),
                        inArray(transactions.issuerId, matchingUserIds),
                      ]
                    : []),
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
            product: {
                with: {
                    category: true,
                }
            },
            issuer: true,
            receiverUser: true,
            targetUser: true,
        },
        limit: limit,
        offset: offset,
    };
}
