"use server";

import {
	asc,
	desc,
	eq,
	inArray,
	or,
	sql,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { transactions } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";
import { TransactionService } from "@/services/transaction-service";

import { getTransactionsQuery } from "./queries";
import {
	topUpUserSchema,
	transactionQuerySchema,
	transferMoneySchema,
} from "./schemas";

export const getUserTransactionsAction = authenticatedAction(
	z.object({
		page: z.number().default(1),
		limit: z.number().default(50),
	}),
	async (data, { session }) => {
		const { page, limit } = data;
		const offset = (page - 1) * limit;

		// Query using Drizzle's query builder to get relations automatically
		const userTransactions = await db.query.transactions.findMany({
			where: eq(transactions.targetUserId, session.userId),
			orderBy: [desc(transactions.createdAt)],
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
		});

		return { success: "OK", data: userTransactions };
	}
);

export const getAllTransactionsAction = authenticatedAction(
	transactionQuerySchema,
	async (data) => {
		const { page, limit, search, type, sort, startDate, endDate } = data;
		const offset = (page - 1) * limit;

        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

		const queryOptions = await getTransactionsQuery(
			search,
			type,
			sort,
			undefined, // No limit on base where generation
			undefined,
            start,
            end
		);

        // STAGE 1: Get the "Visual Rows" (Group Keys)
        // Groups often share groupId. Singles have null groupId.
        // We want to paginate on the unique entities (Group or Single).
        
        let orderByClause = desc(sql`MAX(${transactions.createdAt})`);
        if (sort === "DATE_ASC") orderByClause = asc(sql`MAX(${transactions.createdAt})`);
        // Note: Sort by Amount is tricky with grouping, currently defaulting to Date for grouping structure
        // If sorting by Amount is strictly required for groups, we'd need SUM(amount).
        if (sort === "AMOUNT_DESC") orderByClause = desc(sql`SUM(${transactions.amount})`);
        if (sort === "AMOUNT_ASC") orderByClause = asc(sql`SUM(${transactions.amount})`);


		// STAGE 0: Count Total "Visual Rows" (Groups) for Pagination
		const countResult = await db
			.select({
				count: sql<number>`cast(count(distinct coalesce(${transactions.groupId}::text, ${transactions.id}::text)) as integer)`,
			})
			.from(transactions)
			.where(queryOptions.where);
			
		const totalCount = countResult[0]?.count || 0;

		const keysResult = await db
            .select({
                key: sql`COALESCE(${transactions.groupId}::text, ${transactions.id}::text)`.mapWith(String),
            })
            .from(transactions)
            .where(queryOptions.where)
            .groupBy(sql`COALESCE(${transactions.groupId}::text, ${transactions.id}::text)`)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const keys = keysResult.map((k: any) => k.key as string);

        if (keys.length === 0) {
            return { success: "OK", data: [], totalCount };
        }

        // STAGE 2: Fetch full details for these keys
        // If key is a groupId, we want all txs with that groupId.
        // If key is a txId, we want that tx (which has that id).
		 
		const allTransactions = await db.query.transactions.findMany({
            where: or(
                inArray(transactions.groupId, keys),
                inArray(sql`${transactions.id}::text`, keys)
            ),
            with: {
                shop: true,
				fams: true,
				product: true,
				issuer: true,
				receiverUser: true,
				targetUser: true,
            },
            orderBy: [desc(transactions.createdAt)] 
        });

		return { success: "OK", data: allTransactions, totalCount };
	},
	{ permissions: ["ADMIN_ACCESS", "VIEW_TRANSACTIONS"] }
);

export const exportTransactionsAction = authenticatedAction(
	transactionQuerySchema, // Reuse same schema
	async (data) => {
		const { search, type, sort, startDate, endDate } = data;
        
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

		// No limit for export
		const queryOptions = await getTransactionsQuery(search, type, sort, undefined, undefined, start, end);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const txs = await db.query.transactions.findMany(queryOptions as any);

		// Format for Excel
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const formattedData = txs.map((t: any) => ({
			Date: new Date(t.createdAt).toLocaleString("fr-FR"),
			Type: t.type,
			Montant: (t.amount / 100).toFixed(2),
			Description: t.description,
			"Utilisateur Cible": t.targetUser
				? `${t.targetUser.nom} ${t.targetUser.prenom} (${t.targetUser.username})`
				: "",
			Auteur: t.issuer ? `${t.issuer.nom} ${t.issuer.prenom}` : "",
			Boutique: t.shop?.name || "",
			Produit: t.product?.name || "",
			"Fam'ss": t.fams?.name || "",
		}));

		return { success: "Export OK", data: formattedData };
	},
	{ permissions: ["ADMIN_ACCESS", "VIEW_TRANSACTIONS"] }
);

export const cancelTransactionAction = authenticatedAction(
	z.object({ transactionId: z.string() }),
	async ({ transactionId }, { session }) => {
		await TransactionService.cancelTransaction(transactionId, session.userId);
		revalidatePath("/admin");
		revalidatePath("/admin/users");
		return { success: "Transaction annulée avec succès" };
	},
	{ permissions: ["ADMIN_ACCESS", "CANCEL_TRANSACTIONS"] }
);

export const transferMoneyAction = authenticatedAction(
	transferMoneySchema,
	async (data, { session }) => {
		const { recipientId, amount, description } = data;

		await TransactionService.transferUserToUser(
			session.userId,
			recipientId,
			amount,
			description
		);
		revalidatePath("/transfer");
		revalidatePath("/");
		return { success: "Virement effectué avec succès" };
	}
);

export const topUpUserAction = authenticatedAction(
	topUpUserSchema,
	async (data, { session }) => {
		const { targetUserId, amount, paymentMethod } = data;

		await TransactionService.topUpUser(
			session.userId,
			session.role,
			targetUserId,
			amount,
			paymentMethod
		);

		revalidatePath("/admin/users");
		return { success: "Rechargement effectué avec succès" };
	},
	{ permissions: ["TOPUP_USER", "ADMIN_ACCESS"] }
);

export const cancelTransactionGroupAction = authenticatedAction(
	z.object({ groupId: z.string() }),
	async ({ groupId }, { session }) => {
		const result = await TransactionService.cancelTransactionGroup(
			groupId,
			session.userId
		);
		revalidatePath("/admin");
		revalidatePath("/admin/transactions");
		revalidatePath("/");
		return { success: `${result.count} transactions annulées avec succès` };
	},
	{ permissions: ["ADMIN_ACCESS", "CANCEL_TRANSACTIONS"] }
);
