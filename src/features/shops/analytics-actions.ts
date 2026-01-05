"use server";

import { db } from "@/db";
import { transactions, users, products, shops } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";
import { eq, and, sql, desc, sum, count, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { checkShopPermission } from "./utils";

// --- Schemas ---

const analyticsParamsSchema = z.object({
	shopSlug: z.string(),
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	limit: z.number().optional().default(10), // Top N
});

const stockProjectionParamsSchema = z.object({
	shopSlug: z.string(),
});

// --- Actions ---

export const getMostActiveStaff = authenticatedAction(
	analyticsParamsSchema,
	async ({ shopSlug, startDate, endDate, limit }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) throw new Error("Shop introuvable");

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"VIEW_STATS"
		);

		if (!isAuthorized) throw new Error("Non autorisé");

		// Transactions where the issuer is NOT the target (handled by someone else)
        // OR self-service purchases where issuer == target but context implies staff monitoring?
        // Usually "Most Active Staff" means people who are serving others.
        // If issuerId == targetUserId, it's a self-purchase.
        // We probably want to count transactions *issued* by the user.

		const whereClause = and(
			eq(transactions.shopId, shop.id),
			startDate ? gte(transactions.createdAt, startDate) : undefined,
			endDate ? lte(transactions.createdAt, endDate) : undefined
		);

		const stats = await db
			.select({
				userId: transactions.issuerId,
				count: count(),
				volume: sum(sql`ABS(${transactions.amount})`),
				user: {
					nom: users.nom,
					prenom: users.prenom,
					username: users.username,
                    image: users.image,
				},
			})
			.from(transactions)
			.innerJoin(users, eq(transactions.issuerId, users.id))
			.where(whereClause)
			.groupBy(transactions.issuerId, users.id, users.nom, users.prenom, users.username, users.image)
			.orderBy(desc(count()))
			.limit(limit);

		return { stats };
	}
);

export const getBestCustomers = authenticatedAction(
	analyticsParamsSchema,
	async ({ shopSlug, startDate, endDate, limit }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) throw new Error("Shop introuvable");

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"VIEW_STATS"
		);

		if (!isAuthorized) throw new Error("Non autorisé");

		const whereClause = and(
			eq(transactions.shopId, shop.id),
			eq(transactions.type, "PURCHASE"),
			startDate ? gte(transactions.createdAt, startDate) : undefined,
			endDate ? lte(transactions.createdAt, endDate) : undefined
		);

		const stats = await db
			.select({
				userId: transactions.targetUserId,
				count: count(),
				volume: sum(sql`ABS(${transactions.amount})`), // Total spent
				user: {
					nom: users.nom,
					prenom: users.prenom,
					username: users.username,
                    image: users.image,
				},
			})
			.from(transactions)
			.innerJoin(users, eq(transactions.targetUserId, users.id))
			.where(whereClause)
			.groupBy(transactions.targetUserId, users.id, users.nom, users.prenom, users.username, users.image)
			.orderBy(desc(sum(sql`ABS(${transactions.amount})`))) // Order by spend volume
			.limit(limit);

        // Map volume to number (drizzle might return string)
        const mappedStats = stats.map(s => ({
            ...s,
            volume: Number(s.volume)
        }));

		return { stats: mappedStats };
	}
);

export const getProductSalesStats = authenticatedAction(
	analyticsParamsSchema,
	async ({ shopSlug, startDate, endDate, limit }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) throw new Error("Shop introuvable");

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"VIEW_STATS"
		);

		if (!isAuthorized) throw new Error("Non autorisé");

		const whereClause = and(
			eq(transactions.shopId, shop.id),
			eq(transactions.type, "PURCHASE"),
			startDate ? gte(transactions.createdAt, startDate) : undefined,
			endDate ? lte(transactions.createdAt, endDate) : undefined
		);

		const stats = await db
			.select({
				productId: transactions.productId,
				totalQuantity: sum(transactions.quantity),
				totalRevenue: sum(sql`ABS(${transactions.amount})`),
				product: {
					name: products.name,
					stock: products.stock,
				},
			})
			.from(transactions)
			.innerJoin(products, eq(transactions.productId, products.id))
			.where(whereClause)
			.groupBy(transactions.productId, products.id, products.name, products.stock)
			.orderBy(desc(sum(transactions.quantity)))
			.limit(limit);

        const mappedStats = stats.map(s => ({
            ...s,
            totalQuantity: Number(s.totalQuantity),
            totalRevenue: Number(s.totalRevenue),
        }));

		return { stats: mappedStats };
	}
);

export const getStockProjections = authenticatedAction(
	stockProjectionParamsSchema,
	async ({ shopSlug }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
		});

		if (!shop) throw new Error("Shop introuvable");

		const isAuthorized = await checkShopPermission(
			session.userId,
			session.permissions,
			shop.id,
			"VIEW_STATS"
		);

		if (!isAuthorized) throw new Error("Non autorisé");

        // 1. Get all products with their current stock
        const shopProducts = await db.query.products.findMany({
            where: and(eq(products.shopId, shop.id), eq(products.isArchived, false)),
            columns: {
                id: true,
                name: true,
                stock: true,
            }
        });

        // 2. Calculate daily sales velocity over the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSales = await db
            .select({
                productId: transactions.productId,
                quantity: sum(transactions.quantity),
            })
            .from(transactions)
            .where(and(
                eq(transactions.shopId, shop.id),
                eq(transactions.type, "PURCHASE"),
                gte(transactions.createdAt, thirtyDaysAgo)
            ))
            .groupBy(transactions.productId);
        
        const salesMap = new Map(recentSales.map(s => [s.productId, Number(s.quantity)]));

        // 3. Compute projections
        const projections = shopProducts.map(p => {
            const soldLast30Days = salesMap.get(p.id) || 0;
            const dailyVelocity = soldLast30Days / 30;
            
            let daysRemaining = Infinity;
            if (dailyVelocity > 0) {
                daysRemaining = p.stock / dailyVelocity;
            }

            return {
                productId: p.id,
                name: p.name,
                currentStock: p.stock,
                dailyVelocity,
                daysRemaining: Math.floor(daysRemaining)
            };
        });

        // Filter out products with infinite stock or very low velocity, and sort by risk (lowest days remaining)
        const riskList = projections
            .filter(p => p.daysRemaining < 30 && p.dailyVelocity > 0)
            .sort((a, b) => a.daysRemaining - b.daysRemaining);

		return { projections: riskList };
	}
);
