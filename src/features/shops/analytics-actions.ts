"use server";

import { and, count, desc, eq, gte, lte,sql, sum } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { products, shops,transactions, users } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";

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

export const getShopStats = authenticatedAction(
	analyticsParamsSchema,
	async ({ shopSlug, startDate, endDate }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, shopSlug),
            with: {
                members: true
            }
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
        
        // Fetch all relevant transactions for the chart
        const txs = await db
            .select({
                createdAt: transactions.createdAt,
                amount: transactions.amount,
                type: transactions.type,
            })
            .from(transactions)
            .where(whereClause)
            .orderBy(transactions.createdAt);

        // Process data for charts
        const dailyStats = new Map<string, { revenue: number, expenses: number, profit: number }>();
        let totalRevenue = 0;
        let totalExpenses = 0; // Assuming 0 for now as we don't strictly track COGS yet
        let totalOrders = 0;

        txs.forEach(tx => {
            const dateKey = tx.createdAt.toISOString().split('T')[0];
            const amount = Math.abs(tx.amount);
            
            if (!dailyStats.has(dateKey)) {
                dailyStats.set(dateKey, { revenue: 0, expenses: 0, profit: 0 });
            }
            
            const day = dailyStats.get(dateKey)!;
            
            // Assuming PURCHASE is revenue
            day.revenue += amount;
            day.profit += amount; // expenses are 0
            
            totalRevenue += amount;
            totalOrders++;
        });

        // Fill in missing dates if range is defined
        const chartData = [];
        if (startDate && endDate) {
            let currentDate = new Date(startDate);
            // End date is usually included, ensure we cover it logic
             while (currentDate <= endDate) {
                const dateKey = currentDate.toISOString().split('T')[0];
                const stats = dailyStats.get(dateKey) || { revenue: 0, expenses: 0, profit: 0 };
                chartData.push({
                    date: dateKey,
                    ...stats
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
        } else {
             // If no range, just return keys sorted
             const sortedKeys = Array.from(dailyStats.keys()).sort();
             sortedKeys.forEach(key => {
                  chartData.push({
                      date: key,
                      ...dailyStats.get(key)!
                  });
             });
        }
        
        // Calculate average basket
        const averageBasket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const profit = totalRevenue - totalExpenses;

		return { 
            stats: {
                totalRevenue,
                totalOrders,
                averageBasket,
                memberCount: shop.members.length
            },
            summary: {
                totalRevenue,
                totalExpenses,
                profit
            },
            chartData
        };
	}
);
