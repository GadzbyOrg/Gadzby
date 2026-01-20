"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { shops, shopUsers } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions"; // If used
import { verifySession } from "@/lib/session";
import { ShopService } from "@/services/shop-service";

import { getShopOrThrow, checkShopPermission } from "./utils";
import { SHOP_PERM, ShopPermission } from "./permissions";


export async function addShopMember(
	shopSlug: string,
	emailOrUsername: string,
	roleOrRoleId: string
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
        const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_SETTINGS);

		const targetUser = await db.query.users.findFirst({
			where: (users, { or, ilike, eq }) =>
				or(
					eq(users.email, emailOrUsername),
					ilike(users.username, emailOrUsername),
					ilike(users.bucque, emailOrUsername)
				),
		});

		if (!targetUser) return { error: "Utilisateur introuvable" };

		await ShopService.addMember(shop.id, targetUser.id, roleOrRoleId);

		revalidatePath(`/shops/${shopSlug}/manage/settings`);
		return { success: true };
	} catch (error) {
		console.error("Failed to add shop member:", error);
		if (error instanceof Error) return { error: error.message };
		return { error: "Erreur lors de l'ajout" };
	}
}

export async function removeShopMember(shopSlug: string, userId: string) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_SETTINGS);

		await ShopService.removeMember(shop.id, userId);

		revalidatePath(`/shops/${shopSlug}/manage/settings`);
		return { success: true };
	} catch (error) {
		console.error("Failed to remove member:", error);
		if (error instanceof Error) return { error: error.message };
		return { error: "Erreur lors de la suppression" };
	}
}

export async function updateShopMemberRole(
	shopSlug: string,
	userId: string,
	roleOrRoleId: string
) {
	const session = await verifySession();
	if (!session) return { error: "Non autorisé" };

	try {
		const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_SETTINGS);

		await ShopService.updateMemberRole(shop.id, userId, roleOrRoleId);

		revalidatePath(`/shops/${shopSlug}/manage/settings`);
		return { success: true };
	} catch (error) {
		console.error("Failed to update role:", error);
		if (error instanceof Error) return { error: error.message };
		return { error: "Erreur lors de la mise à jour" };
	}
}

export async function checkTeamMemberAccess(
	shopSlug: string,
	requiredPermission?: ShopPermission
) {
	const session = await verifySession();
    // Default unauthorized response
	if (!session) return { authorized: false, error: "Not logged in" };

	const shop = await db.query.shops.findFirst({
		where: eq(shops.slug, shopSlug),
		with: {
			members: {
				where: eq(shopUsers.userId, session.userId),
				with: { shopRole: true },
			},
		},
	});

	if (!shop) return { authorized: false, error: "Shop not found" };

	if (
		session.permissions.includes("ADMIN_ACCESS") ||
		session.permissions.includes("MANAGE_SHOPS")
	) {
		return {
			authorized: true,
			shop,
			role: "ADMIN",
			userId: session.userId,
            permissions: []
		};
	}

	const authorized = await checkShopPermission(
		session.userId,
		session.permissions,
		shop.id,
		requiredPermission || ""
	);

	if (!authorized) return { authorized: false, error: "Permission denied" };

	const member = shop.members[0];
	return {
		authorized: true,
		shop,
		userId: session.userId,
		permissions: member?.shopRole?.permissions || [],
	};
}
