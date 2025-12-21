"use server";

import { db } from "@/db";
import { products, productCategories, shops, shopUsers } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Type definitions for inputs
export type CreateProductInput = {
    name: string;
    description?: string;
    price: number; // in cents
    stock: number;
    categoryId: string;
    allowSelfService?: boolean;
};

export type UpdateProductInput = Partial<CreateProductInput>;

// Helper to check permissions
async function checkShopPermission(shopSlug: string) {
    const session = await verifySession();
    if (!session) return null;

    // Fetch shop with permissions and user membership
    const shop = await db.query.shops.findFirst({
        where: eq(shops.slug, shopSlug),
        with: {
            members: {
                where: eq(shopUsers.userId, session.userId)
            }
        }
    });
    
    if (!shop) return null;

    if (session.role === "ADMIN") return { session, isAuthorized: true, shop };

    // Check membership
    const membership = shop.members[0];
    if (!membership) return null;

    return { session, isAuthorized: true, shop, membership };
}

function hasShopPermission(
    role: "GRIPSS" | "VP" | "MEMBRE", 
    permissions: any, 
    action: "canSell" | "canManageProducts" | "canManageInventory" | "canViewStats" | "canManageSettings"
): boolean {
    if (role === "GRIPSS") return true;
    if (role === "VP") return permissions.vp[action];
    if (role === "MEMBRE") return permissions.member[action];
    return false;
}

export type ProductOptions = {
    search?: string;
    categoryId?: string;
    sortBy?: 'name' | 'price' | 'stock';
    sortOrder?: 'asc' | 'desc';
};

export async function getShopProducts(shopSlug: string, options: ProductOptions = {}) {
    const perm = await checkShopPermission(shopSlug);

    if (!perm) return { error: "Non autorisé" };

    try {
        const filters = [
            eq(products.shopId, perm.shop.id),
            eq(products.isArchived, false)
        ];

        if (options.categoryId && options.categoryId !== "all") {
            filters.push(eq(products.categoryId, options.categoryId));
        }
        
        let orderBy;
        if (options.sortBy) {
            const sortDir = options.sortOrder === 'desc' ? desc : (c: any) => c;
            
            switch (options.sortBy) {
                case 'price': orderBy = sortDir(products.price); break;
                case 'stock': orderBy = sortDir(products.stock); break;
                case 'name': default: orderBy = sortDir(products.name); break;
            }
        } else {
             orderBy = desc(products.name);
        }

        const allProducts = await db.query.products.findMany({
            where: and(...filters),
            with: {
                category: true,
            },
            orderBy: [orderBy],
        });
        
        let result = allProducts;
        if (options.search) {
             const searchLower = options.search.toLowerCase();
             result = result.filter(p => p.name.toLowerCase().includes(searchLower));
        }

        return { products: result };
    } catch (error) {
        console.error("Failed to fetch products:", error);
        return { error: "Erreur lors de la récupération des produits" };
    }
}

export async function getShopCategories(shopSlug: string) {
     const perm = await checkShopPermission(shopSlug);
    if (!perm) return { error: "Non autorisé" };

    try {
        const categories = await db.query.productCategories.findMany({
            where: eq(productCategories.shopId, perm.shop.id),
        });
        return { categories };
    } catch (error) {
        console.error("Failed to fetch categories:", error);
        return { error: "Erreur lors de la récupération des catégories" };
    }
}


export async function createProduct(shopSlug: string, data: CreateProductInput) {
    const perm = await checkShopPermission(shopSlug);
    if (!perm) return { error: "Non autorisé" };

    if (perm.session.role !== "ADMIN") {
        if (!hasShopPermission(perm.membership!.role as any, perm.shop.permissions, "canManageProducts")) {
            return { error: "Permissions insuffisantes (Gestion Produits)" };
        }
    }

    try {
        await db.insert(products).values({
            shopId: perm.shop.id,
            ...data,
        });

        revalidatePath(`/shops/${shopSlug}/manage/products`);
        return { success: true };
    } catch (error) {
        console.error("Failed to create product:", error);
        return { error: "Erreur lors de la création du produit" };
    }
}

export async function updateProduct(shopSlug: string, productId: string, data: UpdateProductInput) {
    const perm = await checkShopPermission(shopSlug);
    if (!perm) return { error: "Non autorisé" };

    if (perm.session.role !== "ADMIN") {
        if (!hasShopPermission(perm.membership!.role as any, perm.shop.permissions, "canManageProducts")) {
            return { error: "Permissions insuffisantes (Gestion Produits)" };
        }
    }

    try {
        await db.update(products)
            .set(data)
            .where(and(
                eq(products.id, productId),
                eq(products.shopId, perm.shop.id)
            ));

        revalidatePath(`/shops/${shopSlug}/manage/products`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update product:", error);
        return { error: "Erreur lors de la mise à jour du produit" };
    }
}

export async function deleteProduct(shopSlug: string, productId: string) {
    const perm = await checkShopPermission(shopSlug);
    if (!perm) return { error: "Non autorisé" };

    if (perm.session.role !== "ADMIN") {
        if (!hasShopPermission(perm.membership!.role as any, perm.shop.permissions, "canManageProducts")) {
            return { error: "Permissions insuffisantes (Gestion Produits)" };
        }
    }

    try {
        // Soft delete
        await db.update(products)
            .set({ isArchived: true })
            .where(and(
                eq(products.id, productId),
                eq(products.shopId, perm.shop.id)
            ));

        revalidatePath(`/shops/${shopSlug}/manage/products`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete product:", error);
        return { error: "Erreur lors de la suppression du produit" };
    }
}


export async function getProduct(shopSlug: string, productId: string) {
    const perm = await checkShopPermission(shopSlug);
    if (!perm) return { error: "Non autorisé" };

    try {
        const product = await db.query.products.findFirst({
            where: and(
                eq(products.id, productId),
                eq(products.shopId, perm.shop.id)
            ),
            with: {
                category: true
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
    const perm = await checkShopPermission(shopSlug);
    if (!perm) return { error: "Non autorisé" };

    if (perm.session.role !== "ADMIN") {
        if (!hasShopPermission(perm.membership!.role as any, perm.shop.permissions, "canManageProducts")) {
            return { error: "Permissions insuffisantes" };
        }
    }
    
    try {
        const [newCat] = await db.insert(productCategories).values({
            shopId: perm.shop.id,
            name
        }).returning();
        
        return { category: newCat };
    } catch (error) {
         console.error("Failed to create category:", error);
        return { error: "Erreur de création catégorie" };
    }
}

export async function getSelfServiceProducts(shopSlug: string) {
    const shop = await db.query.shops.findFirst({
        where: eq(shops.slug, shopSlug),
        columns: { id: true, isSelfServiceEnabled: true }
    });

    if (!shop || !shop.isSelfServiceEnabled) return { error: "Self-service non disponible" };

    try {
        const productsList = await db.query.products.findMany({
            where: and(
                eq(products.shopId, shop.id),
                eq(products.isArchived, false),
                eq(products.allowSelfService, true)
            ),
            with: {
                category: true
            },
            orderBy: [desc(products.name)]
        });

        const categoriesList = await db.query.productCategories.findMany({
            where: eq(productCategories.shopId, shop.id),
            orderBy: (categories, { asc }) => [asc(categories.name)]
        });

        return { products: productsList, categories: categoriesList };
    } catch (error) {
        console.error("Failed to fetch self service products:", error);
        return { error: "Erreur de chargement" };
    }
}

