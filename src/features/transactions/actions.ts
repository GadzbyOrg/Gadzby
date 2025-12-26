"use server";

import { db } from "@/db";
import { transactions, famss, products, users } from "@/db/schema";
import {
	eq,
	desc,
	and,
	or,
	ilike,
	sql,
	asc,
	isNull,
	gte,
	lte,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { authenticatedAction, authenticatedActionNoInput } from "@/lib/actions";
import { TransactionService } from "@/services/transaction-service";
import {
	transferMoneySchema,
	topUpUserSchema,
	transactionQuerySchema,
} from "./schemas";
import { getTransactionsQuery } from "./queries";
import { z } from "zod";

export const getUserTransactionsAction = authenticatedActionNoInput(
	async ({ session }) => {
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
			limit: 100,
		});

		return { success: "OK", data: userTransactions };
	}
);

export const getAllTransactionsAction = authenticatedAction(
	transactionQuerySchema,
	async (data, { session }) => {
		const { page, limit, search, type, sort } = data;
		const offset = (page - 1) * limit;
		const queryOptions = await getTransactionsQuery(
			search,
			type,
			sort,
			limit,
			offset
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const allTransactions = await db.query.transactions.findMany(
			queryOptions as any
		);
		return { success: "OK", data: allTransactions };
	},
	{ permissions: ["ADMIN_ACCESS", "VIEW_TRANSACTIONS"] }
);

export const exportTransactionsAction = authenticatedAction(
	transactionQuerySchema, // Reuse same schema
	async (data, { session }) => {
		const { search, type, sort } = data;
		// No limit for export
		const queryOptions = await getTransactionsQuery(search, type, sort);

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
