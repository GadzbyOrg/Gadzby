import { and, eq, inArray, ne } from "drizzle-orm";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { productCategories, productRestocks, products, productVariants, shopRoles, shops, shopUsers, transactions, inventoryAudits, inventoryAuditItems, shopExpenses, events, eventRevenues, eventExpenseSplits, eventParticipants } from "@/db/schema";
import { SHOP_PERMISSIONS } from "@/features/shops/permissions";

export class ShopService {
    static async create(data: { name: string; slug?: string; description?: string; category?: string }) {
        let { slug } = data;
        const { name, description, category } = data;

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

    static async delete(shopId: string) {
        await db.transaction(async (tx) => {
            const shopEvents = await tx.query.events.findMany({
                where: eq(events.shopId, shopId),
                columns: { id: true }
            });
            const eventIds = shopEvents.map(e => e.id);

            const shopProducts = await tx.query.products.findMany({
                where: eq(products.shopId, shopId),
                columns: { id: true }
            });
            const productIds = shopProducts.map(p => p.id);

            const audits = await tx.query.inventoryAudits.findMany({
                where: eq(inventoryAudits.shopId, shopId),
                columns: { id: true }
            });
            const auditIds = audits.map(a => a.id);

            if (eventIds.length > 0) {
                await tx.delete(eventRevenues).where(inArray(eventRevenues.eventId, eventIds));
                await tx.delete(eventExpenseSplits).where(inArray(eventExpenseSplits.eventId, eventIds));
                await tx.delete(eventParticipants).where(inArray(eventParticipants.eventId, eventIds));
                
                // Préserver les transactions, on enlève juste le lien avec l'évent
                await tx.update(transactions)
                    .set({ eventId: null })
                    .where(inArray(transactions.eventId, eventIds));
            }

            if (productIds.length > 0) {
                // Préserver les transactions, on enlève le lien vers le produit/variant supprimé
                await tx.update(transactions)
                    .set({ productId: null, productVariantId: null })
                    .where(inArray(transactions.productId, productIds));
                    
                await tx.delete(productVariants).where(inArray(productVariants.productId, productIds));
            }

            // Préserver les transactions liès au shop, on enlève juste le shopId
            await tx.update(transactions)
                .set({ shopId: null })
                .where(eq(transactions.shopId, shopId));

            if (auditIds.length > 0) {
                await tx.delete(inventoryAuditItems).where(inArray(inventoryAuditItems.auditId, auditIds));
            }

            await tx.delete(productRestocks).where(eq(productRestocks.shopId, shopId));
            
            await tx.delete(products).where(eq(products.shopId, shopId));
            await tx.delete(inventoryAudits).where(eq(inventoryAudits.shopId, shopId));
            await tx.delete(shopExpenses).where(eq(shopExpenses.shopId, shopId));

            if (eventIds.length > 0) {
                await tx.delete(events).where(inArray(events.id, eventIds));
            }

            await tx.delete(productCategories).where(eq(productCategories.shopId, shopId));
            await tx.delete(shopUsers).where(eq(shopUsers.shopId, shopId));
            await tx.delete(shopRoles).where(eq(shopRoles.shopId, shopId));
            await tx.delete(shops).where(eq(shops.id, shopId));
        });
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

    static async deleteCategory(shopId: string, categoryId: string) {
        const activeProducts = await db.query.products.findFirst({
            where: and(
                eq(products.shopId, shopId),
                eq(products.categoryId, categoryId),
                eq(products.isArchived, false)
            ),
        });

        if (activeProducts) {
            throw new Error("Impossible de supprimer une catégorie qui contient des produits");
        }

        await db.transaction(async (tx) => {
            const archivedProducts = await tx.query.products.findMany({
                where: and(
                    eq(products.shopId, shopId),
                    eq(products.categoryId, categoryId),
                    eq(products.isArchived, true)
                ),
                columns: { id: true }
            });

            if (archivedProducts.length > 0) {
                // Find or create hidden "__system_archived" category
                let archiveCat = await tx.query.productCategories.findFirst({
                    where: and(
                        eq(productCategories.shopId, shopId),
                        eq(productCategories.name, "__system_archived")
                    )
                });

                if (!archiveCat) {
                    const [newCat] = await tx.insert(productCategories).values({
                        shopId,
                        name: "__system_archived"
                    }).returning();
                    archiveCat = newCat;
                }

                if (categoryId === archiveCat.id) {
                    throw new Error("Impossible de supprimer la catégorie système d'archives");
                }

                const productIds = archivedProducts.map(p => p.id);
                await tx.update(products)
                    .set({ categoryId: archiveCat.id })
                    .where(inArray(products.id, productIds));
            }

            // Finally, delete the category
            await tx.delete(productCategories)
                .where(and(eq(productCategories.id, categoryId), eq(productCategories.shopId, shopId)));
        });
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