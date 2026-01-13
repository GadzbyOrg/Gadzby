import { and,eq } from "drizzle-orm";

import { db } from "@/db";
import { shopUsers } from "@/db/schema";

export function hasShopPermission(
	userPermissions: string[] | undefined | null,
	requiredPermission: string
): boolean {
	if (!userPermissions) return false;
	return userPermissions.includes(requiredPermission);
}

export async function getUserShopPermissions(
	userId: string,
	shopId: string
): Promise<string[]> {
	const member = await db.query.shopUsers.findFirst({
		where: and(eq(shopUsers.userId, userId), eq(shopUsers.shopId, shopId)),
		with: {
			shopRole: true,
		},
	});

	if (!member) return [];

	if (member.shopRole) {
		return member.shopRole.permissions;
	}

	return [];
}

export async function checkShopPermission(
	userId: string,
	userGlobalPermissions: string[],
	shopId: string,
	requiredPermission: string
): Promise<boolean> {
	// 1. Global Admin / Manager Override
	if (
		userGlobalPermissions.includes("ADMIN_ACCESS") ||
		userGlobalPermissions.includes("MANAGE_SHOPS")
	) {
		return true;
	}

	// 2. Shop Specific Permission
	const shopPermissions = await getUserShopPermissions(userId, shopId);
	return hasShopPermission(shopPermissions, requiredPermission);
}
