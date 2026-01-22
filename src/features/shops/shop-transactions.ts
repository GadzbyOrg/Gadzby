"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { shops, transactions } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";
import { TransactionService } from "@/services/transaction-service";
import { getTransactionsQuery } from "../transactions/queries"; // Import from sibling feature

import { 
    getShopTransactionsSchema, 
    processSaleSchema, 
    processSelfServicePurchaseSchema 
} from "./schemas";
import { getShopOrThrow } from "./utils";
import { SHOP_PERM } from "./permissions";


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
	}
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);

		const totalCountResult = await db
			.select({ count: count() })
			.from(transactions)
			.where(whereClause);

		return { transactions: history, shop, totalCount: totalCountResult[0].count };
	}
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const formattedData = data.map((t: any) => ({
			Date: new Date(t.createdAt).toLocaleString("fr-FR"),
			Type: t.type,
			Montant: (t.amount / 100).toFixed(2),
			Description: t.description,
			"Utilisateur Cible": t.targetUser
				? `${t.targetUser.nom} ${t.targetUser.prenom} (${t.targetUser.username})`
				: "",
			Auteur: t.issuer ? `${t.issuer.nom} ${t.issuer.prenom}` : "",
			Produit: t.product?.name || "",
			"Fam'ss": t.fams?.name || "",
		}));

		return { success: "Export réussi", data: formattedData };
	}
);

export const processSelfServicePurchase = authenticatedAction(
	processSelfServicePurchaseSchema,
	async ({ shopSlug, items, paymentSource, famsId }, { session }) => {
        
        
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
        // include products for verification? original did logic with products separately.
		});

		if (!shop) throw new Error("Shop introuvable");
        
		if (!shop.isSelfServiceEnabled)
			throw new Error("Self-service désactivé pour ce shop");

		const productIds = items.map((i) => i.productId);
		const dbProducts = await db.query.products.findMany({
			where: (products, { inArray, and }) =>
				and(
					inArray(products.id, productIds),
					eq(products.shopId, shop.id),
					eq(products.allowSelfService, true)
				),
		});

		if (dbProducts.length !== new Set(productIds).size) {
			throw new Error(
				"Certains produits ne sont pas disponibles en self-service"
			);
		}

		await TransactionService.processShopPurchase(
			shop.id,
			session.userId,
			session.userId,
			items,
			paymentSource,
			famsId,
			"Achat Self-Service:"
		);

		revalidatePath(`/shops/${shopSlug}`);
		return { success: true };
	}
);
