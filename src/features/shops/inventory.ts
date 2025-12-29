"use server";

import { db } from "@/db";
import {
	inventoryAudits,
	inventoryAuditItems,
	products,
	shops,
	shopUsers,
	productRestocks,
	transactions,
} from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, and, desc, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUserShopPermissions } from "./utils";

// Helper to check permissions (Duplicated from products.ts, ideally should be shared)
async function checkShopPermission(shopSlug: string) {
	const session = await verifySession();
	if (!session) return null;

	// Fetch shop with permissions and user membership
	const shop = await db.query.shops.findFirst({
		where: eq(shops.slug, shopSlug),
		with: {
			members: {
				where: eq(shopUsers.userId, session.userId),
				with: { shopRole: true },
			},
		},
	});

	if (!shop) return null;

	if (
		session.permissions.includes("ADMIN_ACCESS") ||
		session.permissions.includes("MANAGE_SHOPS")
	)
		return { session, isAuthorized: true, shop, permissions: [] as string[] };
	// Check membership
	const membership = shop.members[0];
	if (!membership) return null;

	const permissions = membership.shopRole
		? membership.shopRole.permissions
		: [];

	return { session, isAuthorized: true, shop, membership, permissions };
}

export async function restockProduct(
	shopSlug: string,
	productId: string,
	quantity: number
) {
	const perm = await checkShopPermission(shopSlug);
	if (!perm) return { error: "Non autorisé" };

	// Permission check
	if (
		!perm.session.permissions.includes("ADMIN_ACCESS") &&
		!perm.session.permissions.includes("MANAGE_SHOPS")
	) {
		const userPerms = await getUserShopPermissions(
			perm.session.userId,
			perm.shop.id
		);
		const canManage = userPerms.includes("MANAGE_PRODUCTS");
		if (!canManage) return { error: "Non autorisé à gérer les stocks" };
	}

	if (quantity <= 0) return { error: "Quantité invalide" };

	try {
		await db.transaction(async (tx) => {
			// 1. Log Restock
			await tx.insert(productRestocks).values({
				productId: productId,
				shopId: perm.shop.id,
				quantity: quantity,
				createdBy: perm.session.userId,
			});

			// 2. Update Stock
			await tx
				.update(products)
				.set({ stock: sql`${products.stock} + ${quantity}` })
				.where(eq(products.id, productId));
		});

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	} catch (error) {
		console.error("Restock failed:", error);
		return { error: "Erreur lors du réapprovisionnement" };
	}
}

export async function getShopAudits(shopSlug: string) {
	const perm = await checkShopPermission(shopSlug);
	if (!perm) return { error: "Non autorisé" };

	try {
		const audits = await db.query.inventoryAudits.findMany({
			where: eq(inventoryAudits.shopId, perm.shop.id),
			with: {
				creator: true,
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
	const perm = await checkShopPermission(shopSlug);
	if (!perm) return { error: "Non autorisé" };

	try {
		const audit = await db.query.inventoryAudits.findFirst({
			where: and(
				eq(inventoryAudits.id, auditId),
				eq(inventoryAudits.shopId, perm.shop.id)
			),
			with: {
				items: {
					with: {
						product: true,
					},
					orderBy: (items, { asc }) => [asc(items.productId)], // Order could be by product name if we joined differently, but ID is stable
				},
				creator: true,
			},
		});

		if (!audit) return { error: "Inventaire non trouvé" };

		// Sort items by product name manually since we can't easily sort by relation field in deep query
		audit.items.sort((a, b) => a.product.name.localeCompare(b.product.name));

		return { audit };
	} catch (error) {
		console.error("Failed to fetch audit:", error);
		return { error: "Erreur lors du chargement de l'inventaire" };
	}
}

export async function createInventoryAudit(shopSlug: string) {
	const perm = await checkShopPermission(shopSlug);
	if (!perm) return { error: "Non autorisé" };

	try {
		// 1. Create the Audit
		const [audit] = await db
			.insert(inventoryAudits)
			.values({
				shopId: perm.shop.id,
				createdBy: perm.session.userId,
				status: "OPEN",
			})
			.returning();

		// 2. Fetch all products to create snapshot
		const shopProducts = await db.query.products.findMany({
			where: and(
				eq(products.shopId, perm.shop.id),
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
					actualStock: 0, // Default to 0? Or default to systemStock? 0 forces them to count.
					difference: -p.stock, // 0 - stock
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
	const perm = await checkShopPermission(shopSlug);
	if (!perm) return { error: "Non autorisé" };

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
	const perm = await checkShopPermission(shopSlug);
	if (!perm) return { error: "Non autorisé" };

	try {
		// 1. Get Audit and Items
		const audit = await db.query.inventoryAudits.findFirst({
			where: and(
				eq(inventoryAudits.id, auditId),
				eq(inventoryAudits.shopId, perm.shop.id)
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
