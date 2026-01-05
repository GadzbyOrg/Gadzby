'use server';

import { db } from "@/db";
import { mandats, products, transactions, shopExpenses, mandatShops, shops } from "@/db/schema";
import { authenticatedAction, authenticatedActionNoInput } from "@/lib/actions";
import { eq, sql, and, gte, lte, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Calculates total stock value per shop for ALL active shops.
 */
async function calculateShopsStockValue() {
    const result = await db
        .select({
            shopId: shops.id,
            shopName: shops.name,
            shopSlug: shops.slug,
            totalValue: sql<number>`coalesce(sum(${products.stock} * ${products.price}), 0)`
        })
        .from(shops)
        .leftJoin(products, and(eq(products.shopId, shops.id), eq(products.isArchived, false)))
        .groupBy(shops.id, shops.name, shops.slug);
        
    return result.map(r => ({
        shopId: r.shopId,
        shopName: r.shopName,
        shopSlug: r.shopSlug,
        totalValue: Math.round(r.totalValue || 0)
    }));
}

export const getMandatsAction = authenticatedActionNoInput(async () => {
    return await db.query.mandats.findMany({
        orderBy: [desc(mandats.startTime)],
        with: {
            mandatShops: {
                with: {
                    shop: true
                }
            }
        }
    });
}, { permissions: ['MANAGE_MANDATS', 'ADMIN_ACCESS'] });

export const getActiveMandatAction = authenticatedActionNoInput(async () => {
    return await db.query.mandats.findFirst({
        where: eq(mandats.status, 'ACTIVE'),
        with: {
            mandatShops: {
                with: {
                    shop: true
                }
            }
        }
    });
}, { permissions: ['MANAGE_MANDATS', 'ADMIN_ACCESS'] });

export const getMandatDetailsAction = authenticatedAction(
    z.string(),
    async (mandatId) => {
        const mandat = await db.query.mandats.findFirst({
            where: eq(mandats.id, mandatId),
            with: {
                mandatShops: {
                    with: {
                        shop: true
                    }
                }
            }
        });

        if (!mandat) return null;

        // If mandat is ACTIVE, we must calculate values on the fly
        if (mandat.status === 'ACTIVE') {
            const endTime = new Date(); // Now
            const currentStocks = await calculateShopsStockValue();

            // Fetch transactions (sales) per shop
            const salesResult = await db
                .select({
                    shopId: transactions.shopId,
                    totalSales: sql<number>`sum(${transactions.amount})`
                })
                .from(transactions)
                .where(and(
                    inArray(transactions.type, ['PURCHASE', 'REFUND']),
                    gte(transactions.createdAt, mandat.startTime),
                    lte(transactions.createdAt, endTime)
                ))
                .groupBy(transactions.shopId);

            // Fetch expenses per shop
            const expensesResult = await db
                .select({
                    shopId: shopExpenses.shopId,
                    totalExpenses: sql<number>`sum(${shopExpenses.amount})`
                })
                .from(shopExpenses)
                .where(and(
                    gte(shopExpenses.date, mandat.startTime),
                    lte(shopExpenses.date, endTime)
                ))
                .groupBy(shopExpenses.shopId);

            // Update mandatShops with calculated values
            let globalBenefice = 0;
            let globalFinalStock = 0;

            mandat.mandatShops = mandat.mandatShops.map(ms => {
                const currentStock = Number(currentStocks.find(cs => cs.shopId === ms.shopId)?.totalValue || 0);
                const totalSalesRaw = Number(salesResult.find(sr => sr.shopId === ms.shopId)?.totalSales || 0);
                const totalSales = -1 * totalSalesRaw; // Invert to get positive revenue
                const totalExpenses = Number(expensesResult.find(er => er.shopId === ms.shopId)?.totalExpenses || 0);
                
                // Benefice = (Sales + FinalStock) - (InitialStock + Expenses)
                const benefice = (totalSales + currentStock) - (ms.initialStockValue + totalExpenses);

                globalBenefice += benefice;
                globalFinalStock += currentStock;

                return {
                    ...ms,
                    finalStockValue: currentStock, // Estimated final stock
                    sales: totalSales,
                    expenses: totalExpenses,
                    benefice: benefice
                };
            });

            // Update global stats on the returned object
            mandat.finalStockValue = globalFinalStock;
            mandat.finalBenefice = globalBenefice;
        }

        return mandat;
    },
    { permissions: ['MANAGE_MANDATS', 'ADMIN_ACCESS'] }
);


// --- START MANDAT FLOW ---

export const getPreStartMandatDetailsAction = authenticatedActionNoInput(async () => {
   
    const activeMandat = await db.query.mandats.findFirst({
        where: eq(mandats.status, 'ACTIVE')
    });
    
    if (activeMandat) {
        throw new Error("Un mandat est déjà en cours");
    }

    const shopsStock = await calculateShopsStockValue();
    return { shops: shopsStock };
}, { permissions: ['MANAGE_MANDATS', 'ADMIN_ACCESS'] });

export const confirmStartGlobalMandatAction = authenticatedAction(
    z.array(z.object({
        shopId: z.string(),
        initialStockValue: z.number()
    })),
    async (shopsData) => {
        const activeMandat = await db.query.mandats.findFirst({
            where: eq(mandats.status, 'ACTIVE')
        });
        if (activeMandat) {
            throw new Error("Un mandat est déjà en cours");
        }

        // Calculate sum of initial stocks from the USER VALIDATED data
        const totalStockValue = shopsData.reduce((acc, curr) => acc + curr.initialStockValue, 0);

        return await db.transaction(async (tx) => {
            const [newMandat] = await tx.insert(mandats).values({
                initialStockValue: totalStockValue,
                status: 'ACTIVE',
                startTime: new Date(),
            }).returning();

            if (shopsData.length > 0) {
                await tx.insert(mandatShops).values(
                    shopsData.map(s => ({
                        mandatId: newMandat.id,
                        shopId: s.shopId,
                        initialStockValue: s.initialStockValue,
                    }))
                );
            }

            revalidatePath('/admin/mandats');
            return newMandat;
        });
    },
    { permissions: ['MANAGE_MANDATS', 'ADMIN_ACCESS'] }
);


// --- END MANDAT FLOW ---

export const getPreEndMandatDetailsAction = authenticatedActionNoInput(async () => {
    const activeMandat = await db.query.mandats.findFirst({
        where: eq(mandats.status, 'ACTIVE'),
        with: {
            mandatShops: true
        }
    });

    if (!activeMandat) {
        throw new Error("Aucun mandat actif");
    }

    const endTime = new Date();
    // This now returns ALL active shops
    const currentStocks = await calculateShopsStockValue();

    // Fetch transactions (sales) per shop
    const salesResult = await db
        .select({
            shopId: transactions.shopId,
            totalSales: sql<number>`sum(${transactions.amount})`
        })
        .from(transactions)
        .where(and(
            inArray(transactions.type, ['PURCHASE', 'REFUND']),
            gte(transactions.createdAt, activeMandat.startTime),
            lte(transactions.createdAt, endTime)
        ))
        .groupBy(transactions.shopId);

    // Fetch expenses per shop
    const expensesResult = await db
        .select({
            shopId: shopExpenses.shopId,
            totalExpenses: sql<number>`sum(${shopExpenses.amount})`
        })
        .from(shopExpenses)
        .where(and(
            gte(shopExpenses.date, activeMandat.startTime),
            lte(shopExpenses.date, endTime)
        ))
        .groupBy(shopExpenses.shopId);

    // Combine all data
    // Use currentStocks as the source of truth for "Active Shops"
    const shopsDetails = currentStocks.map(shopState => {
        // Find initial state if it exists
        const ms = activeMandat.mandatShops.find(m => m.shopId === shopState.shopId);
        const initialStockValue = ms ? ms.initialStockValue : 0;

        const currentStock = Number(shopState.totalValue); // Already calculated as Number in helper, but safe to cast
        
        const totalSalesRaw = Number(salesResult.find(sr => sr.shopId === shopState.shopId)?.totalSales || 0);
        const totalSales = -1 * totalSalesRaw; // Invert to get positive revenue
        
        const totalExpenses = Number(expensesResult.find(er => er.shopId === shopState.shopId)?.totalExpenses || 0);
        
        // Benefice = (Sales + FinalStock) - (InitialStock + Expenses)
        const benefice = (totalSales + currentStock) - (initialStockValue + totalExpenses);

        return {
            shopId: shopState.shopId,
            shopName: shopState.shopName,
            shopSlug: shopState.shopSlug,
            initialStockValue: initialStockValue,
            finalStockValue: currentStock, // Default proposal
            sales: totalSales,
            expenses: totalExpenses,
            benefice: benefice 
        };
    });

    return { shops: shopsDetails };
}, { permissions: ['MANAGE_MANDATS', 'ADMIN_ACCESS'] });

export const confirmEndGlobalMandatAction = authenticatedAction(
    z.array(z.object({ 
        shopId: z.string(), 
        finalStockValue: z.number()
    })),
    async (shopsData) => {
        const activeMandat = await db.query.mandats.findFirst({
            where: eq(mandats.status, 'ACTIVE'),
            with: { mandatShops: true }
        });
        
        if (!activeMandat) {
            throw new Error("Aucun mandat actif");
        }

        const endTime = new Date();

        return await db.transaction(async (tx) => {
            let globalBenefice = 0;
            let globalFinalStock = 0;

            for (const shopInput of shopsData) {
                let ms = activeMandat.mandatShops.find(m => m.shopId === shopInput.shopId);
                let initialStockValue = 0;

                if (!ms) {
                    // If shop wasn't part of the mandat start, create a record now with 0 initial stock
                    // This handles shops added during the mandat or missed by previous bugs
                    const [newMs] = await tx.insert(mandatShops).values({
                        mandatId: activeMandat.id,
                        shopId: shopInput.shopId,
                        initialStockValue: 0
                    }).returning();
                    ms = newMs;
                    initialStockValue = 0;
                } else {
                    initialStockValue = ms.initialStockValue;
                }

                const finalStockValue = shopInput.finalStockValue;

                // Recompute sales/expenses for consistency
                const salesRes = await tx
                    .select({ value: sql<number>`sum(${transactions.amount})` })
                    .from(transactions)
                    .where(and(
                        eq(transactions.shopId, shopInput.shopId),
                        inArray(transactions.type, ['PURCHASE', 'REFUND']),
                        gte(transactions.createdAt, activeMandat.startTime),
                        lte(transactions.createdAt, endTime)
                    ));
                const totalSales = -1 * Number(salesRes[0]?.value || 0);

                const expRes = await tx
                    .select({ value: sql<number>`sum(${shopExpenses.amount})` })
                    .from(shopExpenses)
                    .where(and(
                        eq(shopExpenses.shopId, shopInput.shopId),
                        gte(shopExpenses.date, activeMandat.startTime),
                        lte(shopExpenses.date, endTime)
                    ));
                const totalExpenses = Number(expRes[0]?.value || 0);

                const benefice = (totalSales + finalStockValue) - (initialStockValue + totalExpenses);

                // Update mandat_shops
                await tx.update(mandatShops)
                    .set({
                        finalStockValue,
                        sales: totalSales,
                        expenses: totalExpenses,
                        benefice
                    })
                    .where(eq(mandatShops.id, ms!.id));

                globalBenefice += benefice;
                globalFinalStock += finalStockValue;
            }

            // Close global mandat
            await tx.update(mandats)
                .set({
                    endTime,
                    finalStockValue: globalFinalStock,
                    finalBenefice: globalBenefice,
                    status: 'COMPLETED'
                })
                .where(eq(mandats.id, activeMandat.id));
            
            revalidatePath('/admin/mandats');
            return { success: true, benefice: globalBenefice };
        });
    },
    { permissions: ['MANAGE_MANDATS', 'ADMIN_ACCESS'] }
);
