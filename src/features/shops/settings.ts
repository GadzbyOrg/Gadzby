"use server";

import { revalidatePath } from "next/cache";
import { authenticatedAction } from "@/lib/actions";
import { ShopService } from "@/services/shop-service";
import { updateShopSchema, createShopSchema, toggleShopStatusSchema } from "./schemas";
import { getShopOrThrow } from "./utils";
import { SHOP_PERM } from "./permissions";

export const createShopAction = authenticatedAction(
    createShopSchema,
    async (data, { session }) => {
       if (
            !session.permissions.includes("ADMIN_ACCESS") &&
            !session.permissions.includes("MANAGE_SHOPS")
        )
            return { error: "Non autorisé" };

        try {
            const newShop = await ShopService.create(data);
            return { success: true, shop: newShop };
        } catch (error) {
             return { error: error instanceof Error ? error.message : "Erreur création shop" };
        }
    }
);


export const updateShop = authenticatedAction(
	updateShopSchema,
	async ({ slug, data }, { session }) => {
		const shop = await getShopOrThrow(slug, session.userId, session.permissions, SHOP_PERM.MANAGE_SETTINGS);

		await ShopService.update(shop.id, data);

		revalidatePath(`/shops/${slug}`);
		revalidatePath(`/shops/${slug}/manage/settings`);
		return { success: true };
	}
);

export const toggleShopStatusAction = authenticatedAction(
    toggleShopStatusSchema,
    async ({ shopId, isActive }, { session }) => {
        
        if (
            !session.permissions.includes("ADMIN_ACCESS") &&
            !session.permissions.includes("MANAGE_SHOPS")
        ) {
             return { error: "Non autorisé" };
        }

        try {
            await ShopService.update(shopId, { isActive });
            revalidatePath("/admin/shops"); // Revalidate the list
            revalidatePath(`/shops/${shopId}`); // Revalidate shop page
            return { success: "Statut mis à jour" };
        } catch (error) {
            return { error: "Erreur lors de la mise à jour du statut" };
        }
    }
);
