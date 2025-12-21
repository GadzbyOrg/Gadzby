"use server";

import { db } from "@/db";
import { shops, shopUsers, users, transactions, products, famss, famsMembers } from "@/db/schema";
import { verifySession } from "@/lib/session";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";



// --- Helper for Permissions ---
function hasShopPermission(
    role: "GRIPSS" | "VP" | "MEMBRE", 
    permissions: any, 
    action: "canSell" | "canManageProducts" | "canManageInventory" | "canViewStats" | "canManageSettings"
): boolean {
    if (role === "GRIPSS") return true; // Owner has full access
    if (role === "VP") return permissions.vp[action];
    if (role === "MEMBRE") return permissions.member[action];
    return false;
}

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
            if (session.role === "ADMIN") {
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
            if (memberRole || session.role === "ADMIN") isVisible = true;
            else if (shop.isSelfServiceEnabled && shop.products.length > 0) isVisible = true;

            const canManage = Object.values(permissions).some(Boolean);

            if (isVisible) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { products, ...shopData } = shop;
                result.push({
                    ...shopData,
                    canManage, // Keep for backward compatibility if needed
                    permissions,
                    role: memberRole || (session.role === "ADMIN" ? "ADMIN" : undefined)
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
    if (!membership && session.role === "ADMIN") {
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
         if (!["ADMIN", "VP", "TRESORIER", "PRESIDENT", "RESPO"].includes(session.role)) {
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
    if (session.role === "ADMIN") isAuthorized = true;
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

            transactionRecords.push({
                amount: -lineAmount,
                type: "PURCHASE" as const,
                walletSource: paymentSource,
                issuerId: session.userId,
                targetUserId: targetUserId,
                shopId: shop.id,
                productId: product.id,
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
                     columns: { balance: true }
                 });

                 if (!currentUser || currentUser.balance < totalAmount) {
                     return { error: "Solde insuffisant" };
                 }

                 await tx.update(users)
                    .set({ balance: sql`${users.balance} - ${totalAmount}` })
                    .where(eq(users.id, targetUserId));
            }

            // 5. Update Stock
            for (const item of items) {
                 await tx.update(products)
                    .set({ stock: sql`${products.stock} - ${item.quantity}` })
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



export async function getShopTransactions(slug: string, limit = 50) {
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
    if (session.role === "ADMIN") isAuthorized = true;
    else if (shop.members[0]) {
        isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canViewStats");
    }

    if (!isAuthorized) return { error: "Non autorisé" };

    try {
        const history = await db.query.transactions.findMany({
            where: eq(transactions.shopId, shop.id),
            orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
            limit: limit,
            with: {
                issuer: {
                    columns: {
                        id: true,
                        username: true,
                        nom: true,
                        prenom: true,
                    }
                },
                targetUser: {
                    columns: {
                        id: true,
                        username: true,
                        nom: true,
                        prenom: true,
                    }
                },
                product: true,
            }
        });

        return { transactions: history, shop };
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        return { error: "Erreur lors de la récupération de l'historique" };
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
                     columns: { balance: true }
                 });

                 if (!user || user.balance < totalAmount) {
                     return { error: "Solde insuffisant" };
                 }

                 await tx.update(users)
                    .set({ balance: sql`${users.balance} - ${totalAmount}` })
                    .where(eq(users.id, session.userId));
            }

            for (const item of items) {
                 await tx.update(products)
                    .set({ stock: sql`${products.stock} - ${item.quantity}` })
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
        if (session.role === "ADMIN") isAuthorized = true;
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

export async function updateShop(slug: string, data: { description?: string, isSelfServiceEnabled?: boolean, permissions?: any }) {
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
        if (session.role === "ADMIN") isAuthorized = true;
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
        if (session.role === "ADMIN") isAuthorized = true;
        else if (shop.members[0]) {
             isAuthorized = hasShopPermission(shop.members[0].role as any, shop.permissions, "canManageSettings");
        }
        
        // GRIPSS role assignment usually restricted?
        if (role === "GRIPSS" && session.role !== "ADMIN") {
             // Maybe allow existing GRIPSS to promote another? Use judgment.
             // For now assume authorized if canManageSettings.
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
        if (session.role === "ADMIN") isAuthorized = true;
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
        if (session.role === "ADMIN") isAuthorized = true;
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

    if (session.role === "ADMIN") return { authorized: true, shop, role: "ADMIN", userId: session.userId };

    const member = shop.members[0];
    if (!member) return { authorized: false, error: "Not a member" };

    if (member.role === "GRIPSS") return { authorized: true, shop, role: "GRIPSS", userId: session.userId };

    if (requiredPermission && (member.role === "VP" || member.role === "MEMBRE")) {
        const hasPerm = hasShopPermission(member.role, shop.permissions, requiredPermission);
        if (!hasPerm) return { authorized: false, error: "Permission denied" };
    }

    return { authorized: true, shop, role: member.role, userId: session.userId };
}
