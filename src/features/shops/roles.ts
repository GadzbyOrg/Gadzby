"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { shopRoles, shops } from "@/db/schema";
import { authenticatedAction } from "@/lib/actions";
import { ShopService } from "@/services/shop-service";

import { createShopRoleSchema, deleteShopRoleSchema, updateShopRoleSchema, getShopBySlugSchema } from "./schemas";
import { getShopOrThrow } from "./utils";
import { SHOP_PERM } from "./permissions";

export const getShopRoles = authenticatedAction(
	getShopBySlugSchema, 
	async ({ slug }, { session }) => {
		const shop = await getShopOrThrow(slug, session.userId, session.permissions, SHOP_PERM.MANAGE_SETTINGS);

		const roles = await db.query.shopRoles.findMany({
			where: eq(shopRoles.shopId, shop.id),
			orderBy: (roles, { asc }) => [asc(roles.name)],
			with: {
				users: true,
			},
		});

		return { roles };
	}
);

export const createShopRole = authenticatedAction(
	createShopRoleSchema,
	async ({ shopSlug, name, permissions }, { session }) => {
		const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_SETTINGS);

		await ShopService.createRole(shop.id, name, permissions);

		revalidatePath(`/shops/${shopSlug}/manage/roles`);
		return { success: "Rôle créé" };
	}
);

export const updateShopRole = authenticatedAction(
	updateShopRoleSchema,
	async ({ shopSlug, roleId, name, permissions }, { session }) => {
		const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_SETTINGS);

		await ShopService.updateRole(shop.id, roleId, name, permissions);

		revalidatePath(`/shops/${shopSlug}/manage/roles`);
		return { success: "Rôle mis à jour" };
	}
);

export const deleteShopRole = authenticatedAction(
	deleteShopRoleSchema,
	async ({ shopSlug, roleId }, { session }) => {
		const shop = await getShopOrThrow(shopSlug, session.userId, session.permissions, SHOP_PERM.MANAGE_SETTINGS);

		await ShopService.deleteRole(shop.id, roleId);

		revalidatePath(`/shops/${shopSlug}/manage/roles`);
		return { success: "Rôle supprimé" };
	}
);
