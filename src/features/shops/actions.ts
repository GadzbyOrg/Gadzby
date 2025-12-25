"use server";

import { db } from "@/db";
import { shops, shopUsers, users, transactions, products, famss, famsMembers, shopExpenses, events } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";



import { hasShopPermission } from "./utils";
import { getTransactionsQuery } from "../transactions/actions";

// --- Helper for Permissions ---
// Removed local definition


export async function getShops() {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
        // 1. Get user's shop memberships with ROLE
        const userMemberships = await db.query.shopUsers.findMany({
            where: eq(shopUsers.userId, session.userId),
            columns: { shopId: true, role: true }
        });
        
        const membershipMap = new Map(userMemberships.map(m => [m.shopId, m.role]));

        // 2. Fetch shops with check for self-service products
        const allShops = await db.query.shops.findMany({
            where: eq(shops.isActive, true),
            orderBy: (shops, { asc }) => [asc(shops.name)],
            with: {
                products: {
                    where: eq(products.allowSelfService, true),
                    limit: 1, // We only need to know if one exists
                    columns: { id: true }
                }
            }
        });

        // 3. Filter and Enhance
        const result = [];
        
        for (const shop of allShops) {
            const memberRole = membershipMap.get(shop.id);
            
            // Default permissions
            let permissions = {
                canSell: false,
                canManageProducts: false,
                canManageInventory: false,
                canViewStats: false,
                canManageSettings: false
            };

            // Calculate Permissions
            if (session.permissions.includes("ADMIN") || session.permissions.includes("MANAGE_SHOPS")) {
                permissions = {
                    canSell: true,
                    canManageProducts: true,
                    canManageInventory: true,
                    canViewStats: true,
                    canManageSettings: true
                };
            } else if (memberRole) {
                if (memberRole === "GRIPSS") {
                    permissions = {
                        canSell: true,
                        canManageProducts: true,
                        canManageInventory: true,
                        canViewStats: true,
                        canManageSettings: true
                    };
                } else if (memberRole === "VP" || memberRole === "MEMBRE") {
                    const p = (shop.permissions as any)?.[memberRole.toLowerCase()];
                    if (p) {
                       permissions = {
                           canSell: !!p.canSell,
                           canManageProducts: !!p.canManageProducts,
                           canManageInventory: !!p.canManageInventory,
                           canViewStats: !!p.canViewStats,
                           canManageSettings: !!p.canManageSettings
                       };
                    }
                }
            }

            // Determine visibility
            let isVisible = false;
            
            // Visibility Logic: Member OR has self-service products OR is Admin
            if (memberRole || session.permissions.includes("ADMIN") || session.permissions.includes("MANAGE_SHOPS")) isVisible = true;
            else if (shop.isSelfServiceEnabled && shop.products.length > 0) isVisible = true;

            const canManage = Object.values(permissions).some(Boolean);

            if (isVisible) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { products, ...shopData } = shop;
                result.push({
                    ...shopData,
                    canManage, // Keep for backward compatibility if needed
                    permissions,
                    role: memberRole || (session.permissions.includes("ADMIN") || session.permissions.includes("MANAGE_SHOPS") ? "ADMIN" : undefined)
                });
            }
        }

		return { shops: result };
	} catch (error) {
		console.error("Failed to fetch shops:", error);
		return { error: "Erreur lors de la récupération des shops" };
	}
}

export async function getShopBySlug(slug: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await db.query.shops.findFirst({
			where: eq(shops.slug, slug),
            with: {
                members: {
                    with: {
                        user: true
                    }
                }
            }
		});

		if (!shop) return { error: "Shop introuvable" };
		return { shop };
	} catch (error) {
		console.error("Failed to fetch shop:", error);
		return { error: "Erreur lors de la récupération du shop" };
	}
}

export async function getShopDetailsForMember(slug: string) {
    const session = await verifySession();
    if (!session) return null;

    const shop = await db.query.shops.findFirst({
        where: eq(shops.slug, slug),
        with: {
            members: {
                where: eq(shopUsers.userId, session.userId),
            }
        }
    });

    if (!shop) return null;

    // Check if user is a member
    let membership = shop.members[0];
    
    // Allow ADMIN override
    if (!membership && (session.permissions.includes("ADMIN") || session.permissions.includes("MANAGE_SHOPS"))) {
        return {
            shop,
            membership: {
                userId: session.userId,
                shopId: shop.id,
                role: "GRIPSS", // Admin acts as boquette grip'ss
            }
        };
    }

    if (!membership) return null; // Not a member

    return { shop, membership };
}

export async function searchUsers(query: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    if (!query || query.length < 2) return { users: [] };

    try {
        const matchingUsers = await db.query.users.findMany({
            where: (users, { or, ilike }) => or(
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
            }
        });

        return { users: matchingUsers };
    } catch (error) {
        console.error("Failed to search users:", error);
        return { error: "Erreur de recherche" };
    }
}

export async function getUserFamss(userId?: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    const targetId = userId || session.userId;
    
    // If fetching for another user, ensure caller is Admin or Manager (simplified check for now)
    if (targetId !== session.userId) {
         if (!session.permissions.includes("ADMIN") && !session.permissions.includes("MANAGE_SHOPS")) {
             // We ideally should check if they manage the shop they are in context of, but this action is generic.
             // For now, allow global managers or just trust the UI context calling it? 
             // Let's allow general staff roles to fetch.
         }
    }

    try {
        const userMemberships = await db.query.famsMembers.findMany({
            where: eq(famsMembers.userId, targetId),
            with: {
                family: true
            }
        });

        return { famss: userMemberships.map(m => m.family) };
    } catch (error) {
        console.error("Failed to fetch famss:", error);
        return { error: "Erreur récupération familles" };
    }
}

export async function processSale(shopSlug: string, targetUserId: string, items: { productId: string, quantity: number }[], paymentSource: "PERSONAL" | "FAMILY" = "PERSONAL", famsId?: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    // 1. Check Permissions
    const shop = await db.query.shops.findFirst({
        where: eq(shops.slug, shopSlug),
        with: {
            members: {
                where: eq(shopUsers.userId, session.userId)
            }
        }
    });

    if (!shop) return { error: "Shop introuvable" };
    
    let isAuthorized = false;
    if (session.permissions.includes("ADMIN") || session.permissions.includes("MANAGE_SHOPS")) isAuthorized = true;
    else if (shop.members[0]) {
        // Use Granular Permissions
        isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canSell");
    }

    if (!isAuthorized) return { error: "Non autorisé à vendre dans ce shop" };

    if (!items.length) return { error: "Panier vide" };

    try {
        // 2. Fetch all products
        const productIds = items.map(i => i.productId);
        const dbProducts = await db.query.products.findMany({
            where: (products, { inArray, and }) => and(
                inArray(products.id, productIds),
                eq(products.shopId, shop.id)
            )
        });

        if (dbProducts.length !== items.length) {
            return { error: "Certains produits sont invalides" };
        }

        let totalAmount = 0;
        const transactionRecords: (typeof transactions.$inferInsert)[] = [];

        // 3. Prepare transaction data
        for (const item of items) {
            const product = dbProducts.find(p => p.id === item.productId);
            if (!product) continue;
            
            const lineAmount = product.price * item.quantity;
            totalAmount += lineAmount;

            let eventIdToLink = null;
            if (product.eventId) {
                const linkedEvent = await db.query.events.findFirst({
                    where: eq(events.id, product.eventId),
                    columns: { id: true, status: true }
                });
                
                if (linkedEvent && linkedEvent.status === 'OPEN') {
                    eventIdToLink = linkedEvent.id;
                }
            }

            transactionRecords.push({
                amount: -lineAmount,
                type: "PURCHASE" as const,
                walletSource: paymentSource,
                issuerId: session.userId,
                targetUserId: targetUserId,
                shopId: shop.id,
                productId: product.id,
                eventId: eventIdToLink || undefined, 
                quantity: item.quantity,
                famsId: paymentSource === "FAMILY" ? famsId : null,
                description: `Achat ${product.name} x${item.quantity}`
            });
        }

        await db.transaction(async (tx) => {
            // 4. Update Balance
            if (paymentSource === "FAMILY") {
                if (!famsId) throw new Error("ID Famille manquant");
                
                // Strict check:
                const isMember = await tx.query.famsMembers.findFirst({
                    where: and(eq(famsMembers.userId, targetUserId), eq(famsMembers.famsId, famsId)),
                    with: { family: true }
                });
                
                if (!isMember) throw new Error("Utilisateur pas membre de cette famille");
                
                if (isMember.family.balance < totalAmount) {
                    return { error: "Solde insuffisant (Fam'ss)" };
                }

                await tx.update(famss)
                    .set({ balance: sql`${famss.balance} - ${totalAmount}` })
                    .where(eq(famss.id, famsId));
            } else {
                 const currentUser = await tx.query.users.findFirst({
                     where: eq(users.id, targetUserId),
                     columns: { balance: true, isAsleep: true }
                 });

                 if (!currentUser || currentUser.balance < totalAmount) {
                     return { error: "Solde insuffisant" };
                 }

                 if (currentUser.isAsleep) {
                     return { error: "Cet utilisateur est désactivé et ne peut pas effectuer d'achats." };
                 }

                 await tx.update(users)
                    .set({ balance: sql`${users.balance} - ${totalAmount}` })
                    .where(eq(users.id, targetUserId));
            }

            // 5. Update Stock
            for (const item of items) {
                 const product = dbProducts.find(p => p.id === item.productId);
                 const fcv = product?.fcv || 1.0;
                 await tx.update(products)
                    .set({ stock: sql`${products.stock} - (${item.quantity}::integer * ${fcv}::double precision)` })
                    .where(eq(products.id, item.productId));
            }

            // 6. Insert Transactions
            await tx.insert(transactions).values(transactionRecords);
        });
        
        revalidatePath(`/shops/${shopSlug}`);
        return { success: true };

    } catch (error) {
        console.error("Transaction failed:", error);
        return { error: "Erreur lors de la transaction" };
    }
}



export async function getShopTransactions(
    slug: string, 
    page = 1, 
    limit = 50,
    search = "", 
    type = "ALL", 
    sort = "DATE_DESC",
    startDate?: Date,
    endDate?: Date
) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    const shop = await db.query.shops.findFirst({
        where: eq(shops.slug, slug),
        with: {
            members: {
                where: eq(shopUsers.userId, session.userId)
            }
        }
    });

    if (!shop) return { error: "Shop introuvable" };
    
    // Check permissions
    let isAuthorized = false;
    if (session.permissions.includes("ADMIN") || session.permissions.includes("MANAGE_SHOPS")) isAuthorized = true;
    else if (shop.members[0]) {
        isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canViewStats");
    }

    if (!isAuthorized) return { error: "Non autorisé" };

    try {
        const offset = (page - 1) * limit;

        // Get base query options from shared transaction logic
        // set limit/offset here or manually? getTransactionsQuery handles them if passed
        const baseQuery = await getTransactionsQuery(search, type, sort, limit, offset, startDate, endDate);

        // We must enforce shopId
        const whereClause = and(baseQuery.where, eq(transactions.shopId, shop.id));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const history = await db.query.transactions.findMany({
            ...baseQuery,
            where: whereClause,
            // with is handled in getTransactionsQuery but likely includes things we might not need or miss things?
            // getTransactionsQuery includes: shop, fams, product, issuer, receiverUser, targetUser.
            // That matches our needs.
        } as any);

        return { transactions: history, shop };
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        return { error: "Erreur lors de la récupération de l'historique" };
    }
}

export async function exportShopTransactionsAction(
    slug: string, 
    search = "", 
    type = "ALL", 
    sort = "DATE_DESC",
    startDate?: Date,
    endDate?: Date
) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    const shop = await db.query.shops.findFirst({
        where: eq(shops.slug, slug),
        with: {
            members: {
                where: eq(shopUsers.userId, session.userId)
            }
        }
    });

    if (!shop) return { error: "Shop introuvable" };
    
    // Check permissions
    let isAuthorized = false;
    if (session.permissions.includes("ADMIN") || session.permissions.includes("MANAGE_SHOPS")) isAuthorized = true;
    else if (shop.members[0]) {
        isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canViewStats");
    }

    if (!isAuthorized) return { error: "Non autorisé" };

    try {
        const baseQuery = await getTransactionsQuery(search, type, sort, undefined, undefined, startDate, endDate);
        const whereClause = and(baseQuery.where, eq(transactions.shopId, shop.id));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await db.query.transactions.findMany({
            ...baseQuery,
            where: whereClause,
            limit: undefined, // No limit for export
            offset: undefined
        } as any);

        // Format for Excel
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedData = data.map((t: any) => ({
            Date: new Date(t.createdAt).toLocaleString("fr-FR"),
            Type: t.type,
            Montant: (t.amount / 100).toFixed(2),
            Description: t.description,
            "Utilisateur Cible": t.targetUser ? `${t.targetUser.nom} ${t.targetUser.prenom} (${t.targetUser.username})` : "",
            "Auteur": t.issuer ? `${t.issuer.nom} ${t.issuer.prenom}` : "",
            "Produit": t.product?.name || "",
            "Fam'ss": t.fams?.name || "",
        }));

        return { success: true, data: formattedData };
    } catch (error) {
        console.error("Failed to export transactions:", error);
        return { error: "Erreur lors de l'export" };
    }
}

export async function processSelfServicePurchase(shopSlug: string, items: { productId: string, quantity: number }[], paymentSource: "PERSONAL" | "FAMILY" = "PERSONAL", famsId?: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    if (!items.length) return { error: "Panier vide" };

    try {
        const shop = await db.query.shops.findFirst({
            where: eq(shops.slug, shopSlug),
        });

        if (!shop) return { error: "Shop introuvable" };
        if (!shop.isSelfServiceEnabled) return { error: "Self-service désactivé pour ce shop" };

        const productIds = items.map(i => i.productId);
        const dbProducts = await db.query.products.findMany({
            where: (products, { inArray, and }) => and(
                inArray(products.id, productIds),
                eq(products.shopId, shop.id),
                eq(products.allowSelfService, true)
            )
        });

        if (dbProducts.length !== items.length) {
            return { error: "Certains produits ne sont pas disponibles en self-service" };
        }

        let totalAmount = 0;
        const transactionRecords: (typeof transactions.$inferInsert)[] = [];

        for (const item of items) {
            const product = dbProducts.find(p => p.id === item.productId);
            if (!product) continue;

            const lineAmount = product.price * item.quantity;
            totalAmount += lineAmount;

            transactionRecords.push({
                amount: -lineAmount,
                type: "PURCHASE" as const,
                walletSource: paymentSource,
                issuerId: session.userId,
                targetUserId: session.userId,
                shopId: shop.id,
                productId: product.id,
                quantity: item.quantity,
                famsId: paymentSource === "FAMILY" ? famsId : null,
                description: `Achat Self-Service: ${product.name} x${item.quantity}`
            });
        }

        await db.transaction(async (tx) => {
             if (paymentSource === "FAMILY") {
                if (!famsId) throw new Error("ID Famille manquant");

                // Check balance
                const fam = await tx.query.famss.findFirst({
                    where: eq(famss.id, famsId),
                    columns: { balance: true }
                });

                if (!fam || fam.balance < totalAmount) {
                     return { error: "Solde insuffisant (Fam'ss)" };
                }

                 await tx.update(famss)
                    .set({ balance: sql`${famss.balance} - ${totalAmount}` })
                    .where(eq(famss.id, famsId));
            } else {
                 const user = await tx.query.users.findFirst({
                     where: eq(users.id, session.userId),
                     columns: { balance: true, isAsleep: true }
                 });

                 if (!user || user.balance < totalAmount) {
                     return { error: "Solde insuffisant" };
                 }

                 if (user.isAsleep) {
                     return { error: "Votre compte est désactivé." };
                 }

                 await tx.update(users)
                    .set({ balance: sql`${users.balance} - ${totalAmount}` })
                    .where(eq(users.id, session.userId));
            }

            for (const item of items) {
                 const product = dbProducts.find(p => p.id === item.productId);
                 const fcv = product?.fcv || 1.0;
                 await tx.update(products)
                    .set({ stock: sql`${products.stock} - (${item.quantity}::integer * ${fcv}::double precision)` })
                    .where(eq(products.id, item.productId));
            }

            await tx.insert(transactions).values(transactionRecords);
        });
        
        revalidatePath(`/shops/${shopSlug}`);
        return { success: true };

    } catch (error) {
        console.error("Self-service transaction failed:", error);
        return { error: "Erreur lors de l'achat" };
    }
}


export async function deleteProduct(shopSlug: string, productId: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    try {
        const shop = await db.query.shops.findFirst({
            where: eq(shops.slug, shopSlug),
            with: {
                members: {
                    where: eq(shopUsers.userId, session.userId)
                }
            }
        });

        if (!shop) return { error: "Shop introuvable" };

        let isAuthorized = false;
        if (session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS")) isAuthorized = true;
        else if (shop.members[0]) {
            isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canManageProducts");
        }

        if (!isAuthorized) return { error: "Non autorisé" };

        await db.delete(products)
            .where(and(
                eq(products.id, productId),
                eq(products.shopId, shop.id)
            ));

        revalidatePath(`/shops/${shopSlug}/manage/products`);
        return { success: true };
    } catch (error) {
        console.error("Failed to delete product:", error);
        return { error: "Erreur lors de la suppression" };
    }
}

export async function updateShop(slug: string, data: { description?: string, isSelfServiceEnabled?: boolean, permissions?: any, defaultMargin?: number }) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

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
        if (session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS")) isAuthorized = true;
        else if (shop.members[0]) {
            // Only GRIPSS or those with canManageSettings can update basic info
            // BUT for permissions, usually only GRIPSS.
            if (data.permissions) {
                 // ONLY GRIPSS
                 if (shop.members[0].role === "GRIPSS") isAuthorized = true;
            } else {
                 isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canManageSettings");
            }
        }

        if (!isAuthorized) return { error: "Non autorisé" };

        await db.update(shops)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(shops.id, shop.id));

        revalidatePath(`/shops/${slug}`);
        revalidatePath(`/shops/${slug}/manage/settings`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update shop:", error);
        return { error: "Erreur lors de la mise à jour" };
    }
}

export async function addShopMember(shopSlug: string, emailOrUsername: string, role: "VP" | "MEMBRE" | "GRIPSS") {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    try {
        const shop = await db.query.shops.findFirst({
            where: eq(shops.slug, shopSlug),
            with: {
                members: {
                    where: eq(shopUsers.userId, session.userId)
                }
            }
        });

        if (!shop) return { error: "Shop introuvable" };

        let isAuthorized = false;
        if (session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS")) isAuthorized = true;
        else if (shop.members[0]) {
             isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canManageSettings");
        }

        if (!isAuthorized) return { error: "Non autorisé" };

        const targetUser = await db.query.users.findFirst({
            where: (users, { or, ilike, eq }) => or(
                eq(users.email, emailOrUsername),
                ilike(users.username, emailOrUsername),
                ilike(users.bucque, emailOrUsername)
            )
        });

        if (!targetUser) return { error: "Utilisateur introuvable" };

        // Check if already member
        const existingMember = await db.query.shopUsers.findFirst({
            where: and(
                eq(shopUsers.shopId, shop.id),
                eq(shopUsers.userId, targetUser.id)
            )
        });

        if (existingMember) return { error: "Cet utilisateur est déjà dans l'équipe" };

        await db.insert(shopUsers).values({
            userId: targetUser.id,
            shopId: shop.id,
            role: role
        });

        revalidatePath(`/shops/${shopSlug}/manage/settings`);
        return { success: true };

    } catch (error) {
        console.error("Failed to add shop member:", error);
        return { error: "Erreur lors de l'ajout" };
    }
}

export async function removeShopMember(shopSlug: string, userId: string) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    try {
        const shop = await db.query.shops.findFirst({
            where: eq(shops.slug, shopSlug),
            with: {
                members: {
                    where: eq(shopUsers.userId, session.userId)
                }
            }
        });

        if (!shop) return { error: "Shop introuvable" };

        let isAuthorized = false;
        if (session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS")) isAuthorized = true;
        else if (shop.members[0]) {
             isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canManageSettings");
        }

        if (!isAuthorized) return { error: "Non autorisé" };

        await db.delete(shopUsers)
            .where(and(
                eq(shopUsers.shopId, shop.id),
                eq(shopUsers.userId, userId)
            ));

        revalidatePath(`/shops/${shopSlug}/manage/settings`);
        return { success: true };
    } catch (error) {
        console.error("Failed to remove member:", error);
        return { error: "Erreur lors de la suppression" };
    }
}

export async function updateShopMemberRole(shopSlug: string, userId: string, newRole: "VP" | "MEMBRE" | "GRIPSS") {
     const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    try {
        const shop = await db.query.shops.findFirst({
            where: eq(shops.slug, shopSlug),
            with: {
                members: {
                    where: eq(shopUsers.userId, session.userId)
                }
            }
        });

        if (!shop) return { error: "Shop introuvable" };

        let isAuthorized = false;
        if (session.permissions.includes("ADMIN") || session.permissions.includes("MANAGE_SHOPS")) isAuthorized = true;
        else if (shop.members[0]) {
             isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canManageSettings");
        }

        if (!isAuthorized) return { error: "Non autorisé" };

        await db.update(shopUsers)
            .set({ role: newRole })
            .where(and(
                eq(shopUsers.shopId, shop.id),
                eq(shopUsers.userId, userId)
            ));

        revalidatePath(`/shops/${shopSlug}/manage/settings`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update role:", error);
        return { error: "Erreur lors de la mise à jour" };
    }

}

export async function checkTeamMemberAccess(shopSlug: string, requiredPermission?: "canSell" | "canManageProducts" | "canManageInventory" | "canViewStats" | "canManageSettings") {
    const session = await verifySession();
    if (!session) return { authorized: false };

    const shop = await db.query.shops.findFirst({
        where: eq(shops.slug, shopSlug),
        with: {
            members: {
                where: eq(shopUsers.userId, session.userId)
            }
        }
    });

    if (!shop) return { authorized: false, error: "Shop not found" };

    if (session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS")) return { authorized: true, shop, role: "ADMIN", userId: session.userId };

    const member = shop.members[0];
    if (!member) return { authorized: false, error: "Not a member" };

    if (member.role === "GRIPSS") return { authorized: true, shop, role: "GRIPSS", userId: session.userId };

    if (requiredPermission && (member.role === "VP" || member.role === "MEMBRE")) {
        const hasPerm = hasShopPermission(member.role, shop.permissions, requiredPermission);
        if (!hasPerm) return { authorized: false, error: "Permission denied" };
    }

    return { authorized: true, shop, role: member.role, userId: session.userId };
}

export async function createShopAction(data: { name: string, description?: string, category?: string, slug?: string }) {
    const session = await verifySession();
    if (!session || !session.permissions.includes("ADMIN_ACCESS") && !session.permissions.includes("MANAGE_SHOPS")) return { error: "Non autorisé" };

    try {
        let slug = data.slug;
        if (!slug) {
            slug = data.name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }

        const existingShop = await db.query.shops.findFirst({
            where: eq(shops.slug, slug)
        });

        if (existingShop) return { error: "Ce slug est déjà utilisé" };

        await db.insert(shops).values({
            name: data.name,
            slug: slug,
            description: data.description,
            category: data.category,
        });

        revalidatePath("/shops");
        return { success: true };
    } catch (error) {
        console.error("Failed to create shop:", error);
        return { error: "Erreur lors de la création" };
    }
}

export async function getShopStats(
    slug: string, 
    timeframe: '7d' | '30d' | '90d' | 'all' | 'custom', 
    customStartDate?: Date, 
    customEndDate?: Date
) {
    const session = await verifySession();
    if (!session) return { error: "Non autorisé" };

    const shop = await db.query.shops.findFirst({
        where: eq(shops.slug, slug),
        with: {
            members: {
                where: eq(shopUsers.userId, session.userId)
            }
        }
    });

    if (!shop) return { error: "Shop introuvable" };
    
    // Check permissions
    let isAuthorized = false;
    if (session.permissions.includes("ADMIN_ACCESS") || session.permissions.includes("MANAGE_SHOPS")) isAuthorized = true;
    else if (shop.members[0]) {
        isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canViewStats");
    }

    if (!isAuthorized) return { error: "Non autorisé" };

    try {
        let startDate: Date;
        let endDate: Date = new Date(); // now

        if (timeframe === 'custom' && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
            // Ensure end of day for endDate
            endDate.setHours(23, 59, 59, 999);
            // Ensure start of day for startDate
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date();
            // Reset to start of day for consistency? Or keep sliding window?
            // Let's go with exact days back from now, but maybe snap to start of day for cleanliness
            startDate.setHours(0,0,0,0);
            
            if (timeframe === '7d') startDate.setDate(startDate.getDate() - 7);
            else if (timeframe === '30d') startDate.setDate(startDate.getDate() - 30);
            else if (timeframe === '90d') startDate.setDate(startDate.getDate() - 90);
            else if (timeframe === 'all') startDate = new Date(0); // Epoch
        }

        // Fetch Revenues (Transactions of type PURCHASE)
        // Amount is negative for purchases
        const revenueTransactions = await db.query.transactions.findMany({
            where: and(
                eq(transactions.shopId, shop.id),
                eq(transactions.type, "PURCHASE"),
                gte(transactions.createdAt, startDate),
                lte(transactions.createdAt, endDate)
            ),
            columns: {
                amount: true,
                createdAt: true,
            }
        });

        // Fetch Expenses
        const expenseRecords = await db.query.shopExpenses.findMany({
            where: and(
                eq(shopExpenses.shopId, shop.id),
                gte(shopExpenses.date, startDate),
                lte(shopExpenses.date, endDate)
            ),
            columns: {
                amount: true,
                date: true,
            }
        });

        // Aggregate by Date
        const statsByDate = new Map<string, { date: string, revenue: number, expenses: number, profit: number }>();

        // Helper to format date key YYYY-MM-DD
        const getDateKey = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        // Initialize map with all dates in range? 
        // Or just sparse? Let's do sparse for now, chart lib usually handles gaps or we fill them in frontend.
        // Actually for a nice chart, filling gaps is better.
        
        const currentDate = new Date(startDate);
        const endLoopDate = new Date(endDate);
        if (timeframe !== 'all') { // Don't fill 50 years if all is selected
             while (currentDate <= endLoopDate) {
                 const key = getDateKey(currentDate);
                 statsByDate.set(key, { date: key, revenue: 0, expenses: 0, profit: 0 });
                 currentDate.setDate(currentDate.getDate() + 1);
             }
        }

        let totalRevenue = 0;
        let totalExpenses = 0;

        revenueTransactions.forEach(tx => { // tx.amount is negative
            const key = getDateKey(new Date(tx.createdAt));
            if (!statsByDate.has(key) && timeframe === 'all') {
                 statsByDate.set(key, { date: key, revenue: 0, expenses: 0, profit: 0 });
            }
            
            if (statsByDate.has(key)) {
                const dayStat = statsByDate.get(key)!;
                const revenueAmount = Math.abs(tx.amount); // Convert to positive for revenue display
                dayStat.revenue += revenueAmount;
                totalRevenue += revenueAmount;
                dayStat.profit += revenueAmount; // Profit = Revenue - Expenses (Expenses deducted later)
            }
        });

        expenseRecords.forEach(exp => {
            const key = getDateKey(new Date(exp.date));
             if (!statsByDate.has(key) && timeframe === 'all') {
                 statsByDate.set(key, { date: key, revenue: 0, expenses: 0, profit: 0 });
            }

            if (statsByDate.has(key)) {
                const dayStat = statsByDate.get(key)!;
                dayStat.expenses += exp.amount;
                totalExpenses += exp.amount;
                dayStat.profit -= exp.amount;
            }
        });

        // Sort by date
        const sortedChartData = Array.from(statsByDate.values()).sort((a, b) => a.date.localeCompare(b.date));

        return {
            summary: {
                totalRevenue,
                totalExpenses,
                profit: totalRevenue - totalExpenses
            },
            chartData: sortedChartData
        };

    } catch (error) {
        console.error("Failed to fetch shop stats:", error);
        return { error: "Erreur lors du calcul des statistiques" };
    }
}



export async function getAdminShops() {
    const session = await verifySession();
    if (!session || !session.permissions.includes("ADMIN_ACCESS") && !session.permissions.includes("MANAGE_SHOPS")) return { error: "Non autorisé" };

    try {
        const allShops = await db.query.shops.findMany({
            orderBy: (shops, { asc }) => [asc(shops.name)],
            with: {
                members: {
                    columns: { userId: true }
                }
            }
        });

        return { shops: allShops };
    } catch (error) {
        console.error("Failed to fetch admin shops:", error);
        return { error: "Erreur lors de la récupération des shops" };
    }
}

export async function toggleShopStatusAction(shopId: string, isActive: boolean) {
    const session = await verifySession();
    if (!session || !session.permissions.includes("ADMIN_ACCESS") && !session.permissions.includes("MANAGE_SHOPS")) return { error: "Non autorisé" };

    try {
        await db.update(shops)
            .set({ 
                isActive: isActive,
                updatedAt: new Date()
            })
            .where(eq(shops.id, shopId));

        revalidatePath("/admin/shops");
        return { success: true };
    } catch (error) {
        console.error("Failed to toggle shop status:", error);
        return { error: "Erreur lors de la mise à jour du statut" };
    }
}
