"use server";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { productCategories, products, productVariants, shops, shopUsers } from "@/db/schema";
import { authenticatedAction, authenticatedActionNoInput } from "@/lib/actions";

import { 
    getShopBySlugSchema, 
    getUserFamssSchema,
    searchUsersSchema,
} from "./schemas";

import { SHOP_PERMISSIONS } from "./permissions";

// --- Queries / Getters ---

export const getShops = authenticatedActionNoInput(async ({ session }) => {
	const userMemberships = await db.query.shopUsers.findMany({
		where: eq(shopUsers.userId, session.userId),
		with: { shopRole: true },
	});

	const membershipMap = new Map(userMemberships.map((m) => [m.shopId, m]));

	const allShops = await db.query.shops.findMany({
		where: eq(shops.isActive, true),
		orderBy: (shops, { asc }) => [asc(shops.name)],
		with: {
			products: {
				where: eq(products.allowSelfService, true),
				limit: 1,
				columns: { id: true },
			},
		},
	});

	const result = [];

	for (const shop of allShops) {
		const membership = membershipMap.get(shop.id);
		let permissionList: string[] = [];

		if (
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS")
		) {
			permissionList = [...SHOP_PERMISSIONS];
		} else if (membership) {
			if (membership.shopRole) {
				permissionList = membership.shopRole.permissions;
			}
		}

		const permissions = {
			canSell: permissionList.includes("SELL"),
			canManageProducts: permissionList.includes("MANAGE_PRODUCTS"),
			canManageInventory: permissionList.includes("MANAGE_INVENTORY"),
			canViewStats: permissionList.includes("VIEW_STATS"),
			canManageSettings: permissionList.includes("MANAGE_SETTINGS"),
			canManageEvents: permissionList.includes("MANAGE_EVENTS"),
			canManageExpenses: permissionList.includes("MANAGE_EXPENSES"),
		};

		const isVisible =
			!!membership ||
			session.permissions.includes("ADMIN_ACCESS") ||
			session.permissions.includes("MANAGE_SHOPS") ||
			(shop.isSelfServiceEnabled && shop.products.length > 0);

		const canManage = Object.values(permissions).some(Boolean);

		if (isVisible) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { products: _products, ...shopData } = shop;
			result.push({
				...shopData,
				canManage,
				permissions,
				role:
					membership?.shopRole?.name ||
					(session.permissions.includes("ADMIN_ACCESS") ||
					session.permissions.includes("MANAGE_SHOPS")
						? "ADMIN"
						: undefined),
			});
		}
	}

	return { shops: result };
});

export const getAdminShops = authenticatedActionNoInput(async ({ session }) => {
    if (
        !session.permissions.includes("ADMIN_ACCESS") &&
        !session.permissions.includes("MANAGE_SHOPS")
    ) {
        return { error: "Non autorisé" };
    }

    const allShops = await db.query.shops.findMany({
        orderBy: (shops, { asc }) => [asc(shops.name)],
        with: {
            members: {
                columns: { userId: true }
            }
        }
    });

    return { shops: allShops };
});

export const getShopBySlug = authenticatedAction(
	getShopBySlugSchema,
	async ({ slug }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
			with: {
				members: {
					with: {
						user: true,
						shopRole: true,
					},
				},
			},
		});

		if (!shop) throw new Error("Shop introuvable");
		return { shop };
	}
);

export const getShopDetailsForMember = authenticatedAction(
	getShopBySlugSchema,
	async ({ slug }, { session }) => {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
			with: {
				members: {
					where: eq(shopUsers.userId, session.userId),
					with: { shopRole: true },
				},
			},
		});

		if (!shop) return null;

		const membership = shop.members[0];

		if (
			!membership &&
			(session.permissions.includes("ADMIN_ACCESS") ||
				session.permissions.includes("MANAGE_SHOPS"))
		) {
			return {
				shop,
				membership: {
					userId: session.userId,
					shopId: shop.id,
					role: "GRIPSS",
					shopRole: { name: "ADMIN", permissions: [...SHOP_PERMISSIONS] },
				},
			};
		}

		if (!membership) return null;

		return { shop, membership };
	}
);

export const searchUsers = authenticatedAction(
	searchUsersSchema,
	async ({ query }) => {
		const matchingUsers = await db.query.users.findMany({
			where: (users, { or, ilike }) =>
				or(
					ilike(users.username, `%${query}%`),
					ilike(users.nom, `%${query}%`),
					ilike(users.prenom, `%${query}%`),
					ilike(users.bucque, `%${query}%`)
				),
			limit: 10,
			columns: {
				id: true,
				username: true,
				nom: true,
				prenom: true,
				bucque: true,
				image: true,
				balance: true,
				isAsleep: true,
			},
		});

		return { users: matchingUsers };
	}
);

export const getUserFamss = authenticatedAction(
	getUserFamssSchema,
	async ({ userId }, { session }) => {
		const targetId = userId || session.userId;

		const members = await db.query.famsMembers.findMany({
			where: (t, { eq }) => eq(t.userId, targetId),
			with: { family: true },
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { famss: members.map((m: any) => m.family) };
});

export async function getSelfServiceProducts(shopSlug: string) {
    // Public/Self-service
    // logic moved from products.ts, imports updated (db, shops, products, eq, etc.)
    const shop = await db.query.shops.findFirst({
        where: eq(shops.slug as any, shopSlug), 
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
                category: true,
                variants: {
                    where: eq(productVariants.isArchived, false),
                    orderBy: (variants, { asc }) => [asc(variants.quantity)]
                }
            },
            orderBy: [asc(products.displayOrder), asc(products.name)]
        });

        const categoriesList = await db.query.productCategories.findMany({
            where: eq(productCategories.shopId, shop.id),
            orderBy: (categories, { asc }) => [asc(categories.name)]
        });

        // Sort products in-memory to match management view: Category Name -> Display Order -> Name
        productsList.sort((a, b) => {
            // 1. Category Name
            const catA = a.category?.name || "zzzzzz"; // Put uncategorized last (or first depending on preference, usually last)
            const catB = b.category?.name || "zzzzzz";
            
            if (catA !== catB) return catA.localeCompare(catB);
            
            // 2. Display Order
            if (a.displayOrder !== b.displayOrder) {
                // Handle null/undefined displayOrder if necessary, though schema implies it might be set. 
                // Assuming 0 or generic number if null, but usually it's an int.
                return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
            }

            // 3. Name
            return a.name.localeCompare(b.name);
        });

        return { products: productsList, categories: categoriesList };
    } catch (error) {
        console.error("Failed to fetch self service products:", error);
        return { error: "Erreur de chargement" };
    }
}
