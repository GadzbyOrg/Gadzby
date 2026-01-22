"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { productCategories, productRestocks,products, shops } from "@/db/schema";

import { authenticatedAction } from "@/lib/actions";
import { getUserShopPermissions,hasShopPermission } from "./utils";
import { importProductsBatchSchema } from "./schemas";

// Helper to sanitize keys
function sanitizeKey(key: string) {
    return key
        .normalize("NFD") // Split accents
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric (spaces, quotes, etc)
}

export const importProducts = authenticatedAction(
    importProductsBatchSchema,
    async (data, { session }) => {
        const { slug, rows: rawJson } = data;

        try {
            const shop = await db.query.shops.findFirst({
                where: eq(shops.slug, slug),
            });

            if (!shop) return { error: "Shop introuvable" };

            const userPerms = await getUserShopPermissions(session.userId, shop.id);
            const isAdmin = session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS");

            if (!isAdmin && !hasShopPermission(userPerms, "MANAGE_PRODUCTS")) {
                 return { error: "Non autorisé" };
            }

            if (!rawJson.length) return { error: "Fichier vide" };

            console.log(`[Import] Starting import for shop ${slug} with ${rawJson.length} rows`);

            // Get existing categories map
            const existingCategories = await db.query.productCategories.findMany({
                where: eq(productCategories.shopId, shop.id)
            });
            const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase().trim(), c.id]));
            console.log(`[Import] Found ${existingCategories.length} existing categories`);

            // Get existing products map to check for duplicates
            const existingProducts = await db.query.products.findMany({
                where: and(eq(products.shopId, shop.id), eq(products.isArchived, false))
            });
            const productMap = new Map(existingProducts.map(p => [p.name.toLowerCase().trim(), p]));
            console.log(`[Import] Found ${existingProducts.length} existing products`);

            let successCount = 0;
            let updateCount = 0;
            let errorCount = 0;
            console.log(rawJson)

            if (rawJson.length > 0) {
                 const firstRowKeys = Object.keys(rawJson[0]);
                 console.log("[Import] First row keys (original):", firstRowKeys);
                 console.log("[Import] First row keys (sanitized):", firstRowKeys.map(k => `${k} -> ${sanitizeKey(k)}`));
            }

            await db.transaction(async (tx) => {
                let rowIndex = 0;
                for (const row of rawJson) {
                    rowIndex++;
                    // Expected rows
                    let name: unknown, cost: unknown, stock: unknown, categoryName: unknown;

                    for (const key of Object.keys(row)) {
                        const sKey = sanitizeKey(key);
                        if (sKey === "name" || sKey === "nom" || sKey === "produit") name = row[key];
                        if (sKey === "cost" || sKey === "cout" || sKey === "prixdachat" || sKey === "achat") cost = row[key];
                        if (sKey === "stock" || sKey === "quantite" || sKey === "qte") stock = row[key];
                        if (sKey === "category" || sKey === "categorie" || sKey === "cat") categoryName = row[key];
                    }

                    if (!name || cost === undefined) {
                        console.log(`[Import] Row ${rowIndex} skipped: Missing name or cost. Data:`, row);
                        errorCount++;
                        continue;
                    }

                    const nameStr = String(name).trim();
                    const costVal = parseFloat(String(cost));
                    const stockVal = stock ? parseFloat(String(stock)) : 0;
                    
                    // Calculate Selling Price
                    const margin = shop.defaultMargin || 0;
                    const sellingPriceParam = costVal * (1 + margin / 100);
                    const sellingPriceCents = Math.round(sellingPriceParam * 100); 

                    // Category handling
                    let categoryId: string;
                    const sCat = categoryName ? String(categoryName).trim() : "Défaut";
                    const sCatLower = sCat.toLowerCase();
                    
                    if (categoryMap.has(sCatLower)) {
                        categoryId = categoryMap.get(sCatLower)!;
                    } else {
                        console.log(`[Import] Creating new category: ${sCat}`);
                        const [newCat] = await tx.insert(productCategories).values({
                            shopId: shop.id,
                            name: sCat
                        }).returning();
                        
                        categoryId = newCat.id;
                        categoryMap.set(sCatLower, newCat.id);
                    }

                    // Check if product exists
                    const existingProduct = productMap.get(nameStr.toLowerCase());

                    if (existingProduct) {
                        // UPDATE Logic
                        // 1. Update fields (Price, Category)
                        await tx.update(products)
                            .set({
                                price: sellingPriceCents,
                                categoryId: categoryId,
                                // Do NOT overwrite stock directly here, strict restock logic below
                            })
                            .where(eq(products.id, existingProduct.id));

                        // 2. Restock if quantity > 0
                        if (stockVal > 0) {
                            await tx.insert(productRestocks).values({
                                productId: existingProduct.id,
                                shopId: shop.id,
                                quantity: stockVal,
                                createdBy: session.userId
                            });
                            
                            await tx.update(products)
                                .set({ stock: sql`${products.stock} + ${stockVal}` })
                                .where(eq(products.id, existingProduct.id));
                        }

                        updateCount++;
                    } else {
                        // CREATE Logic
                        const [newProduct] = await tx.insert(products).values({
                            shopId: shop.id,
                            name: nameStr,
                            price: sellingPriceCents,
                            stock: 0, // Initial stock 0, we restock right after
                            categoryId: categoryId,
                            allowSelfService: true,
                        }).returning();

                        if (stockVal > 0) {
                            await tx.insert(productRestocks).values({
                                productId: newProduct.id,
                                shopId: shop.id,
                                quantity: stockVal,
                                createdBy: session.userId
                            });

                            await tx.update(products)
                                .set({ stock: stockVal })
                                .where(eq(products.id, newProduct.id));
                        }
                        
                        // Add to map for subsequent dupes in same file?
                         productMap.set(nameStr.toLowerCase(), newProduct as any);
                        successCount++;
                    }
                }
            });
            
            console.log(`[Import] Completed. Success: ${successCount}, Updated: ${updateCount}, Errors: ${errorCount}`);

            revalidatePath(`/shops/${slug}/manage/products`);
            return { 
                success: `${successCount} créés, ${updateCount} mis à jour. ${errorCount} erreurs.`,
                importedCount: successCount + updateCount,
                failCount: errorCount
            };

        } catch (error) {
            console.error("Import failed:", error);
            return { error: "Erreur lors de l'import" };
        }
    },
    { permissions: ["MANAGE_PRODUCTS"] }
);
