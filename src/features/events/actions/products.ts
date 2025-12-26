"use server";

import { db } from "@/db";
import { products } from "@/db/schema/products";
import { shopUsers } from "@/db/schema/shops";
import { authenticatedAction } from "@/lib/actions";
import {
	linkProductsSchema,
	unlinkProductSchema,
	shopIdSchema,
} from "../schemas";
import { hasShopPermission } from "@/features/shops/utils";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Helper for permissions (duplicated from management.ts)
async function checkShopPermission(
	userId: string,
	permissions: string[],
	shopId: string,
	action: "canManageProducts" | "canViewStats"
) {
	if (permissions.includes("ADMIN") || permissions.includes("MANAGE_SHOPS")) {
		return true;
	}

	const membership = await db.query.shopUsers.findFirst({
		where: and(eq(shopUsers.shopId, shopId), eq(shopUsers.userId, userId)),
		with: { shop: true },
	});

	if (!membership) return false;

	return hasShopPermission(
		membership.role as any,
		membership.shop.permissions,
		action
	);
}

export const getAvailableProductsAction = authenticatedAction(
    shopIdSchema,
    async (data, { session }) => {
        const authorized = await checkShopPermission(
            session.userId,
            session.permissions,
            data.shopId,
            "canManageProducts"
        );
        if (!authorized) return { error: "Unauthorized" };

        const available = await db.query.products.findMany({
            where: and(
                eq(products.shopId, data.shopId),
                isNull(products.eventId),
                eq(products.isArchived, false) 
            ),
        });

        return { success: "Products retrieved", data: available };
    }
);

export const linkProductsToEvent = authenticatedAction(
	linkProductsSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db
			.update(products)
			.set({ eventId: data.eventId })
			.where(inArray(products.id, data.productIds));

		revalidatePath(`/admin/shops/${data.shopId}/events/${data.eventId}`);
		return { success: "Products linked" };
	}
);

export const unlinkProductFromEvent = authenticatedAction(
	unlinkProductSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"canManageProducts"
		);
		if (!authorized) return { error: "Unauthorized" };

		await db
			.update(products)
			.set({ eventId: null })
			.where(eq(products.id, data.productId));

		revalidatePath(`/admin/shops/${data.shopId}/events/${data.eventId}`);
		return { success: "Product unlinked" };
	}
);
