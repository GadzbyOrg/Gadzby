import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { productCategories, productRestocks, products, shopRoles, shops, shopUsers } from "@/db/schema";
import { sql } from "drizzle-orm";
import { SHOP_PERMISSIONS } from "@/features/shops/permissions";

export class ShopService {
    static async create(data: { name: string; slug?: string; description?: string; category?: string }) {
        let { slug, name, description, category } = data;

        if (!slug) {
            slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        }

        const existingShop = await db.query.shops.findFirst({
            where: eq(shops.slug, slug),
        });

        if (existingShop) throw new Error("Ce shop existe déjà");

        const [newShop] = await db.insert(shops).values({
            name,
            slug,
            description,
            category,
        }).returning();

        // Create default shop roles
        await db.insert(shopRoles).values([
            {
                shopId: newShop.id,
                name: "Chef",
                permissions: [...SHOP_PERMISSIONS],
            },
            {
                shopId: newShop.id,
                name: "Membre",
                permissions: SHOP_PERMISSIONS.filter((p) => p !== "MANAGE_SETTINGS" && p !== "MANAGE_EVENTS"),
            },
            {
                shopId: newShop.id,
                name: "VP",
                permissions: ["SELL", "MANAGE_INVENTORY", "MANAGE_PRODUCTS"]
            }
        ]);

        return newShop;
    }

    static async update(shopId: string, data: { description?: string; isSelfServiceEnabled?: boolean; defaultMargin?: number; isActive?: boolean }) {
         await db
            .update(shops)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(shops.id, shopId));
    }

    // --- Roles ---

    static async createRole(shopId: string, name: string, permissions: string[]) {
        await db.insert(shopRoles).values({
            shopId,
            name,
            permissions,
        });
    }

    static async updateRole(shopId: string, roleId: string, name: string, permissions: string[]) {
         await db
            .update(shopRoles)
            .set({ name, permissions, updatedAt: new Date() })
            .where(and(eq(shopRoles.id, roleId), eq(shopRoles.shopId, shopId)));
    }

    static async deleteRole(shopId: string, roleId: string) {
        const assigned = await db.query.shopUsers.findFirst({
			where: eq(shopUsers.shopRoleId, roleId),
		});
		if (assigned) throw new Error("Ce rôle est assigné à des membres");

		await db
			.delete(shopRoles)
			.where(and(eq(shopRoles.id, roleId), eq(shopRoles.shopId, shopId)));
    }

    // --- Members ---

    static async addMember(shopId: string, userId: string, roleOrRoleId: string) {
        const existingMember = await db.query.shopUsers.findFirst({
			where: and(
				eq(shopUsers.shopId, shopId),
				eq(shopUsers.userId, userId)
			),
		});

		if (existingMember)
			throw new Error("Cet utilisateur est déjà dans l'équipe");

		let newRoleId: string | null = null;
		if (!["VP", "MEMBRE", "GRIPSS"].includes(roleOrRoleId)) {
			newRoleId = roleOrRoleId;
		}

		await db.insert(shopUsers).values({
			userId: userId,
			shopId: shopId,
			shopRoleId: newRoleId,
		});
    }

    static async removeMember(shopId: string, userId: string) {
         await db
            .delete(shopUsers)
            .where(and(eq(shopUsers.shopId, shopId), eq(shopUsers.userId, userId)));
    }

    static async updateMemberRole(shopId: string, userId: string, roleOrRoleId: string) {
        let newRoleId: string | null = null;
		if (!["VP", "MEMBRE", "GRIPSS"].includes(roleOrRoleId)) {
			newRoleId = roleOrRoleId;
		}

		await db
			.update(shopUsers)
			.set({ shopRoleId: newRoleId })
			.where(and(eq(shopUsers.shopId, shopId), eq(shopUsers.userId, userId)));
    }

    // --- Products ---

    static async createProduct(shopId: string, data: { name: string; description?: string; price: number; stock: number; categoryId: string; unit?: string; allowSelfService?: boolean; fcv?: number }, creatorId: string) {
        return await db.transaction(async (tx) => {
            const [newProduct] = await tx.insert(products).values({
                shopId,
                ...data,
            }).returning();

            if (data.stock > 0) {
                 await tx.insert(productRestocks).values({
                    productId: newProduct.id,
                    shopId,
                    quantity: data.stock,
                    createdBy: creatorId
                 });
            }
            return newProduct;
        });
    }

    static async updateProduct(shopId: string, productId: string, data: Partial<{ name: string; description?: string; price: number; stock: number; categoryId: string; unit?: string; allowSelfService?: boolean; fcv?: number }>) {
        await db.update(products)
            .set(data)
            .where(and(
                eq(products.id, productId),
                eq(products.shopId, shopId)
            ));
    }

    static async deleteProduct(shopId: string, productId: string) {
         await db.update(products)
            .set({ isArchived: true })
            .where(and(
                eq(products.id, productId),
                eq(products.shopId, shopId)
            ));
    }

    static async createCategory(shopId: string, name: string) {
        const [newCat] = await db.insert(productCategories).values({
            shopId,
            name
        }).returning();
        return newCat;
    }

    // --- Inventory ---

    static async restockProduct(shopId: string, productId: string, quantity: number, userId: string) {
        await db.transaction(async (tx) => {
			// 1. Log Restock
			await tx.insert(productRestocks).values({
				productId: productId,
				shopId: shopId,
				quantity: quantity,
				createdBy: userId,
			});

			// 2. Update Stock
			await tx
				.update(products)
				.set({ stock: sql`${products.stock} + ${quantity}` })
				.where(eq(products.id, productId));
		});
    }
}