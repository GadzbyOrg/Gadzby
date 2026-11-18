"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { transactions } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";
import { TransactionService } from "@/services/transaction-service";

import { getTransactionsQuery } from "../transactions/queries"; // Import from sibling feature
import { SHOP_PERM } from "./permissions";
import {
	getShopTransactionsSchema,
	processSaleSchema,
	processSelfServicePurchaseSchema
} from "./schemas";
import { purchaseSelfService } from "./self-service";
import { getShopOrThrow } from "./utils";


export const processSale = authenticatedAction(
	processSaleSchema,
	async (
		{ shopSlug, targetUserId, items, paymentSource, famsId },
		{ session }
	) => {
		const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.SELL);

		await TransactionService.processShopPurchase(
			shop.id,
			session.userId,
			targetUserId,
			items,
			paymentSource,
			famsId
		);

		revalidatePath(`/shops/${shopSlug}`);
		return { success: true };
	},
	{ name: "processSale" },
);

export const getShopTransactions = authenticatedAction(
	getShopTransactionsSchema,
	async (params, { session }) => {
		const {
			slug,
			page,
			limit,
			search,
			type,
			sort,
			startDate,
			endDate,
			eventId,
		} = params;


		const shop = await getShopOrThrow(slug, session.userId, session.permissions, SHOP_PERM.VIEW_STATS);

		const offset = (page - 1) * limit;

		const baseQuery = await getTransactionsQuery(
			search,
			type,
			sort,
			limit,
			offset,
			startDate,
			endDate,
			eventId
		);

		const whereClause = and(baseQuery.where, eq(transactions.shopId, shop.id));

		const history = await db.query.transactions.findMany({
			...baseQuery,
			where: whereClause,

		} as any);

		const totalCountResult = await db
			.select({ count: count() })
			.from(transactions)
			.where(whereClause);

		return { transactions: history, shop, totalCount: totalCountResult[0].count };
	},
	{ name: "getShopTransactions" },
);

export const exportShopTransactionsAction = authenticatedAction(
	getShopTransactionsSchema,
	async (params, { session }) => {
		const { slug, search, type, sort, startDate, endDate, eventId } = params;

		const shop = await getShopOrThrow(slug, session.userId, session.permissions, SHOP_PERM.VIEW_STATS);

		const baseQuery = await getTransactionsQuery(
			search,
			type,
			sort,
			undefined,
			undefined,
			startDate,
			endDate,
			eventId
		);
		const whereClause = and(baseQuery.where, eq(transactions.shopId, shop.id));

		const data = await db.query.transactions.findMany({
			...baseQuery,
			where: whereClause,
			limit: undefined,
			offset: undefined,

		} as any);


		const formattedData = data.map((t: any) => ({
			Date: new Date(t.createdAt).toLocaleString("fr-FR"),
			Type: t.type,
			Montant: (t.amount / 100).toFixed(2),
			Description: t.description,
			"Utilisateur Cible": t.targetUser
				? `${t.targetUser.nom} ${t.targetUser.prenom} (${t.targetUser.username})`
				: "",
			Auteur: t.issuer ? `${t.issuer.nom} ${t.issuer.prenom}` : "",
			Categorie: t.product?.category?.name || "",
			Produit: t.product?.name || "",
			"Fam'ss": t.fams?.name || "",
		}));

		return { success: "Export réussi", data: formattedData };
	},
	{ name: "exportShopTransactionsAction" },
);

export const processSelfServicePurchase = authenticatedAction(
	processSelfServicePurchaseSchema,
	async ({ shopSlug, items, paymentSource, famsId }, { session }) => {
		await purchaseSelfService({
			shop: { slug: shopSlug },
			userId: session.userId,
			items,
			paymentSource,
			famsId,
			descriptionPrefix: "Achat Self-Service:",
		});

		revalidatePath(`/shops/${shopSlug}`);
		return { success: true };
	},
	{ name: "processSelfServicePurchase" },
);
