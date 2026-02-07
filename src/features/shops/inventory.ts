"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
	inventoryAuditItems,
	inventoryAudits,
	productRestocks,
	products,
} from "@/db/schema";
import { verifySession } from "@/lib/session";
import { ShopService } from "@/services/shop-service";

import { getShopOrThrow } from "./utils";
import { SHOP_PERM } from "./permissions";

export async function restockProduct(
	shopSlug: string,
	productId: string,
	quantity: number
) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

	const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_PRODUCTS);

	if (quantity <= 0) return { error: "Quantité invalide" };

	try {
        await ShopService.restockProduct(shop.id, productId, quantity, session.userId);

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	} catch (error) {
		console.error("Restock failed:", error);
		return { error: "Erreur lors du réapprovisionnement" };
	}
}

export async function getShopAudits(shopSlug: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };
    
	const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_INVENTORY);
    
	try {
		const audits = await db.query.inventoryAudits.findMany({
			where: eq(inventoryAudits.shopId, shop.id),
			with: {
				creator: true,
                items: {
                    with: {
                        product: {
                            columns: {
                                price: true
                            }
                        }
                    }
                }
			},
			orderBy: [desc(inventoryAudits.createdAt)],
		});
		return { audits };
	} catch (error) {
		console.error("Failed to fetch audits:", error);
		return { error: "Erreur lors de la récupération des inventaires" };
	}
}

export async function getAudit(shopSlug: string, auditId: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_INVENTORY);

	try {
		const audit = await db.query.inventoryAudits.findFirst({
			where: and(
				eq(inventoryAudits.id, auditId),
				eq(inventoryAudits.shopId, shop.id)
			),
			with: {
				items: {
					with: {
						product: {
                            with: {
                                category: true,
                            }
                        },
					},
				},
				creator: true,
			},
		});

		if (!audit) return { error: "Inventaire non trouvé" };

		// Sort items by Category Name -> Display Order -> Product Name
		audit.items.sort((a, b) => {
            const catA = a.product.category?.name || "zzz"; // Put uncategorized last
            const catB = b.product.category?.name || "zzz"; 
            
            // 1. Category Name
            const catDiff = catA.localeCompare(catB);
            if (catDiff !== 0) return catDiff;
            
            // 2. Display Order
            const orderA = a.product.displayOrder ?? 0;
            const orderB = b.product.displayOrder ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            
            // 3. Product Name (Fallback)
            return a.product.name.localeCompare(b.product.name);
        });

		return { audit };
	} catch (error) {
		console.error("Failed to fetch audit:", error);
		return { error: "Erreur lors du chargement de l'inventaire" };
	}
}

export async function createInventoryAudit(shopSlug: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_INVENTORY);

	try {
		// 1. Create the Audit
		const [audit] = await db
			.insert(inventoryAudits)
			.values({
				shopId: shop.id,
				createdBy: session.userId,
				status: "OPEN",
			})
			.returning();

		// 2. Fetch all products to create snapshot
		const shopProducts = await db.query.products.findMany({
			where: and(
				eq(products.shopId, shop.id),
				eq(products.isArchived, false)
			),
		});

		// 3. Create Audit Items
		if (shopProducts.length > 0) {
			await db.insert(inventoryAuditItems).values(
				shopProducts.map((p) => ({
					auditId: audit.id,
					productId: p.id,
					systemStock: p.stock,
					actualStock: 0, 
					difference: -p.stock, 
				}))
			);
		}

		revalidatePath(`/shops/${shopSlug}/manage/inventory`);
		return { auditId: audit.id };
	} catch (error) {
		console.error("Failed to create audit:", error);
		return { error: "Erreur lors de la création de l'inventaire" };
	}
}

export async function updateAuditItem(
	shopSlug: string,
	auditId: string,
	itemId: string,
	actualStock: number
) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_INVENTORY);

	try {
        
		// Get the item to calculate diff
		const currentItem = await db.query.inventoryAuditItems.findFirst({
			where: eq(inventoryAuditItems.id, itemId),
		});

		if (!currentItem) return { error: "Item introuvable" };

		const difference = actualStock - currentItem.systemStock;

		await db
			.update(inventoryAuditItems)
			.set({ actualStock, difference })
			.where(eq(inventoryAuditItems.id, itemId));

		revalidatePath(`/shops/${shopSlug}/manage/inventory/${auditId}`);
		return { success: true };
	} catch (error) {
		console.error("Failed to update audit item:", error);
		return { error: "Erreur de mise à jour" };
	}
}

export async function completeInventoryAudit(
	shopSlug: string,
	auditId: string
) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_INVENTORY);

	try {
		// 1. Get Audit and Items
		const audit = await db.query.inventoryAudits.findFirst({
			where: and(
				eq(inventoryAudits.id, auditId),
				eq(inventoryAudits.shopId, shop.id)
			),
			with: {
				items: true,
			},
		});

		if (!audit) return { error: "Inventaire introuvable" };
		if (audit.status === "COMPLETED")
			return { error: "Inventaire déjà validé" };

		await db.transaction(async (tx) => {
			// Mark audit as completed
			await tx
				.update(inventoryAudits)
				.set({ status: "COMPLETED", completedAt: new Date() })
				.where(eq(inventoryAudits.id, auditId));

			// Update each product
			for (const item of audit.items) {
				// Update stock validation sans calcul FCV
				await tx
					.update(products)
					.set({ stock: item.actualStock })
					.where(eq(products.id, item.productId));
			}
		});

		revalidatePath(`/shops/${shopSlug}/manage/inventory`);
		revalidatePath(`/shops/${shopSlug}/manage/products`); // Update products list too
		return { success: true };
	} catch (error) {
		console.error("Failed to complete audit:", error);
		return { error: "Erreur lors de la validation" };
	}
}
