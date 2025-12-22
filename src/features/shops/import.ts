"use server";

import { db } from "@/db";
import { products, productCategories, shops, shopUsers } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { hasShopPermission } from "./utils";

// Helper to sanitize keys
function sanitizeKey(key: string) {
    return key.toLowerCase().trim().replace(/\s+/g, "");
}

// MATCHES usage with useActionState
// We now expect slug to be inside formData or bound. 
// However, the cleanest way with the modal's "additionalData" is to just read it from formData.
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
            with: {
                members: {
                    where: eq(shopUsers.userId, session.userId)
                }
            }
        });

        if (!shop) return { error: "Shop introuvable" };

        let isAuthorized = false;
        if (session.role === "ADMIN") isAuthorized = true;
        else if (shop.members[0]) {
             isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canManageProducts");
        }

        if (!isAuthorized) return { error: "Non autorisé" };

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

        let successCount = 0;
        let errorCount = 0;

        // Process rows
        for (const row of rawJson) {
            // Expected columns: Name, Cost (Prix dachat), Stock, Category
            // Flexible keys mapping
            let name, cost, stock, categoryName;

            for (const key of Object.keys(row)) {
                const sKey = sanitizeKey(key);
                if (sKey === "name" || sKey === "nom" || sKey === "produit") name = row[key];
                if (sKey === "cost" || sKey === "cout" || sKey === "prixdachat" || sKey === "achat") cost = row[key];
                if (sKey === "stock" || sKey === "quantite" || sKey === "qte") stock = row[key];
                if (sKey === "category" || sKey === "categorie" || sKey === "cat") categoryName = row[key];
            }

            if (!name || cost === undefined) {
                // Skip invalid rows?
                errorCount++;
                continue;
            }

            // Parse numbers
            const costVal = parseFloat(String(cost));
            const stockVal = stock ? parseInt(String(stock)) : 0;
            
            // Calculate Selling Price
            // Cost is likely in Euros or Cents? Usually excel users put Euros.
            // Let's assume Euros for Input, Store as Cents.
            // Margin: Price = Cost * (1 + margin/100)
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
                // Create new category
                const [newCat] = await db.insert(productCategories).values({
                    shopId: shop.id,
                    name: sCat
                }).returning();
                
                categoryId = newCat.id;
                categoryMap.set(sCatLower, newCat.id);
            }

            // Create Product
            await db.insert(products).values({
                shopId: shop.id,
                name: String(name),
                price: sellingPriceCents,
                stock: stockVal,
                categoryId: categoryId,
                allowSelfService: true, // Default to true? Or false? Let's default true for ease.
                // image: null, // Removed
            });

            successCount++;
        }

        revalidatePath(`/shops/${slug}/manage/products`);
        return { 
            success: `${successCount} produits importés. ${errorCount} erreurs.` 
        };

    } catch (error) {
        console.error("Import failed:", error);
        return { error: "Erreur lors de l'import" };
    }
}
