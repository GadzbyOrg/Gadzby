"use server";

import { and, AnyColumn, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { productCategories, products, productVariants, shops } from "@/db/schema"; // productRestocks removed
import { authenticatedAction } from "@/lib/actions";
import { verifySession } from "@/lib/session";
import { ShopService } from "@/services/shop-service";
import { getShopOrThrow, getUserShopPermissions } from "./utils";
import { SHOP_PERM } from "./permissions";
import { CreateProductInput, UpdateProductInput, deleteProductSchema } from "./schemas";

export const deleteProduct = authenticatedAction(
	deleteProductSchema,
	async ({ shopSlug, productId }, { session }) => {
		const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_PRODUCTS);
        
		await ShopService.deleteProduct(shop.id, productId);

		revalidatePath(`/shops/${shopSlug}/manage/products`);
		return { success: true };
	}
);


export async function getProduct(shopSlug: string, productId: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    try {
        const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions);
        
        let isAuthorized = false;
        if (session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS")) {
            isAuthorized = true;
        } else {
            const perms = await getUserShopPermissions(session.userId, shop.id);
            if (perms.length > 0) isAuthorized = true;
        }
        if (!isAuthorized) return { error: "Non autorisé" };

        const product = await db.query.products.findFirst({
            where: and(
                eq(products.id, productId),
                eq(products.shopId, shop.id)
            ),
            with: {
                category: true,
                variants: {
                    where: eq(productVariants.isArchived, false)
                }
            }
        });
        
        if (!product) return { error: "Produit introuvable" };
        
        return { product };
    } catch (error) {
        console.error("Failed to get product:", error);
        return { error: "Erreur de chargement" };
    }
}

export async function createCategory(shopSlug: string, name: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };
    
    try {
        const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_PRODUCTS);
        
        const category = await ShopService.createCategory(shop.id, name);
        
        return { category };
    } catch (error) {
         console.error("Failed to create category:", error);
        return { error: "Erreur de création catégorie" };
    }
}



// Restoring original function signature for createProduct
export async function createProduct(shopSlug: string, data: CreateProductInput) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    try {
        const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_PRODUCTS);

        await ShopService.createProduct(shop.id, data, session.userId);

        revalidatePath(`/shops/${shopSlug}/manage/products`);
        return { success: true };
    } catch (error) {
        console.error("Failed to create product:", error);
        return { error: "Erreur lors de la création du produit" };
    }
}

export async function updateProduct(shopSlug: string, productId: string, data: UpdateProductInput) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    try {
        const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_PRODUCTS);

        await ShopService.updateProduct(shop.id, productId, data);

        revalidatePath(`/shops/${shopSlug}/manage/products`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update product:", error);
        return { error: "Erreur lors de la mise à jour du produit" };
    }
}



export async function getShopProducts(shopSlug: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    try {
        const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions);
        
        let isAuthorized = false;
        if (session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS")) {
            isAuthorized = true;
        } else {
            const perms = await getUserShopPermissions(session.userId, shop.id);
            if (perms.length > 0) isAuthorized = true;
        }
        
        if (!isAuthorized) return { error: "Non autorisé" };

        const productsList = await db.query.products.findMany({
            where: and(
                eq(products.shopId, shop.id),
                eq(products.isArchived, false)
            ),
            with: {
                category: true,
                variants: {
                    where: eq(productVariants.isArchived, false),
                    orderBy: (variants, { asc }) => [asc(variants.quantity)]
                }
            },
            orderBy: [desc(products.name)]
        });

        return { products: productsList };
    } catch (error) {
        console.error("Failed to fetch shop products:", error);
        return { error: "Erreur de chargement" };
    }
}

export async function getShopCategories(shopSlug: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    try {
        const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions);

        let isAuthorized = false;
        if (session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS")) {
            isAuthorized = true;
        } else {
            const perms = await getUserShopPermissions(session.userId, shop.id);
            if (perms.length > 0) isAuthorized = true;
        }
        
        if (!isAuthorized) return { error: "Non autorisé" };

        const categoriesList = await db.query.productCategories.findMany({
            where: eq(productCategories.shopId, shop.id),
            orderBy: (categories, { asc }) => [asc(categories.name)]
        });

        return { categories: categoriesList };
    } catch (error) {
        console.error("Failed to fetch shop categories:", error);
        return { error: "Erreur de chargement" };
    }
}
