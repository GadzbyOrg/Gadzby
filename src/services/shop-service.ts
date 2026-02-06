import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { productCategories, productRestocks, products, productVariants, shopRoles, shops, shopUsers } from "@/db/schema";
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

    static async createProduct(shopId: string, data: { name: string; description?: string; price: number; stock: number; categoryId: string; unit?: string; allowSelfService?: boolean; fcv?: number, variants?: { name: string; quantity: number; price?: number }[] }, creatorId: string) {
        return await db.transaction(async (tx) => {
            const [newProduct] = await tx.insert(products).values({
                shopId,
                name: data.name,
                description: data.description,
                price: data.price,
                stock: data.stock,
                categoryId: data.categoryId,
                unit: data.unit,
                allowSelfService: data.allowSelfService,
                fcv: data.fcv
            }).returning();

            if (data.stock > 0) {
                 await tx.insert(productRestocks).values({
                    productId: newProduct.id,
                    shopId,
                    quantity: data.stock,
                    createdBy: creatorId
                 });
            }

            if (data.variants && data.variants.length > 0) {
                await tx.insert(productVariants).values(
                    data.variants.map(v => ({
                        productId: newProduct.id,
                        name: v.name,
                        quantity: v.quantity,
                        price: v.price
                    }))
                );
            }

            return newProduct;
        });
    }

    static async updateProduct(shopId: string, productId: string, data: Partial<{ name: string; description?: string; price: number; stock: number; categoryId: string; unit?: string; allowSelfService?: boolean; fcv?: number; variants?: { id?: string; name: string; quantity: number; price?: number }[] }>) {
        await db.transaction(async (tx) => {
            const { variants, ...productData } = data;
            
            if (Object.keys(productData).length > 0) {
                await tx.update(products)
                .set(productData)
                .where(and(
                    eq(products.id, productId),
                    eq(products.shopId, shopId)
                ));
            }

            if (variants) {
                // 1. Get existing variants
                const existingVariants = await tx.query.productVariants.findMany({
                    where: and(
                        eq(productVariants.productId, productId),
                        eq(productVariants.isArchived, false)
                    )
                });

                const existingIds = new Set(existingVariants.map(v => v.id));
                const newIds = new Set(variants.filter(v => v.id).map(v => v.id));

                // 2. Archive removed variants
                const toArchive = existingVariants.filter(v => !newIds.has(v.id));
                for (const v of toArchive) {
                    await tx.update(productVariants)
                        .set({ isArchived: true })
                        .where(eq(productVariants.id, v.id));
                }

                // 3. Update existing variants
                const toUpdate = variants.filter(v => v.id && existingIds.has(v.id));
                for (const v of toUpdate) {
                     await tx.update(productVariants)
                        .set({
                            name: v.name,
                            quantity: v.quantity,
                            price: v.price
                        })
                        .where(eq(productVariants.id, v.id!));
                }

                // 4. Create new variants
                const toCreate = variants.filter(v => !v.id);
                if (toCreate.length > 0) {
                    await tx.insert(productVariants).values(
                        toCreate.map(v => ({
                            productId,
                            name: v.name,
                            quantity: v.quantity,
                            price: v.price
                        }))
                    );
                }
            }
        });
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
        const existingCategory = await db.query.productCategories.findFirst({
            where: and(
                eq(productCategories.shopId, shopId),
                eq(productCategories.name, name)
            ),
        });

        if (existingCategory) {
            throw new Error("Une catégorie avec ce nom existe déjà");
        }

        const [newCat] = await db.insert(productCategories).values({
            shopId,
            name
        }).returning();
        return newCat;
    }

    static async updateCategory(shopId: string, categoryId: string, name: string) {
        const existingCategory = await db.query.productCategories.findFirst({
            where: and(
                eq(productCategories.shopId, shopId),
                eq(productCategories.name, name),
                ne(productCategories.id, categoryId)
            ),
        });

        if (existingCategory) {
            throw new Error("Une catégorie avec ce nom existe déjà");
        }

        await db
            .update(productCategories)
            .set({ name })
            .where(and(eq(productCategories.id, categoryId), eq(productCategories.shopId, shopId)));
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

    static async updateProductsOrder(shopId: string, productIds: string[]) {
        await db.transaction(async (tx) => {
            for (let i = 0; i < productIds.length; i++) {
                await tx.update(products)
                    .set({ displayOrder: i })
                    .where(and(
                        eq(products.id, productIds[i]),
                        eq(products.shopId, shopId)
                    ));
            }
        });
    }
}