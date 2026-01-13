"use server";

// ... imports
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

import { db } from "@/db";
import { productCategories, productRestocks,products, shops } from "@/db/schema";
import { verifySession } from "@/lib/session";

import { getUserShopPermissions,hasShopPermission } from "./utils";

// Helper to sanitize keys
function sanitizeKey(key: string) {
    return key
        .normalize("NFD") // Split accents
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric (spaces, quotes, etc)
}

export async function importProducts(prevState: any, formData: FormData) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    const file = formData.get("file") as File;
    const slug = formData.get("slug") as string;
    
    if (!slug) return { error: "Slug du shop manquant" };
    if (!file) return { error: "Aucun fichier fourni" };

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

        // Parse Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!rawJson.length) return { error: "Fichier vide" };

        // Get existing categories map
        const existingCategories = await db.query.productCategories.findMany({
            where: eq(productCategories.shopId, shop.id)
        });
        const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase().trim(), c.id]));

        // Get existing products map to check for duplicates
        const existingProducts = await db.query.products.findMany({
            where: and(eq(products.shopId, shop.id), eq(products.isArchived, false))
        });
        const productMap = new Map(existingProducts.map(p => [p.name.toLowerCase().trim(), p]));

        let successCount = 0;
        let updateCount = 0;
        let errorCount = 0;

        await db.transaction(async (tx) => {
            for (const row of rawJson) {
                // Expected rows
                let name, cost, stock, categoryName;

                for (const key of Object.keys(row)) {
                    const sKey = sanitizeKey(key);
                    if (sKey === "name" || sKey === "nom" || sKey === "produit") name = row[key];
                    if (sKey === "cost" || sKey === "cout" || sKey === "prixdachat" || sKey === "achat") cost = row[key];
                    if (sKey === "stock" || sKey === "quantite" || sKey === "qte") stock = row[key];
                    if (sKey === "category" || sKey === "categorie" || sKey === "cat") categoryName = row[key];
                }

                if (!name || cost === undefined) {
                    console.log("Invalid row:", row);
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

        revalidatePath(`/shops/${slug}/manage/products`);
        return { 
            success: `${successCount} créés, ${updateCount} mis à jour. ${errorCount} erreurs.` 
        };

    } catch (error) {
        console.error("Import failed:", error);
        return { error: "Erreur lors de l'import" };
    }
}
