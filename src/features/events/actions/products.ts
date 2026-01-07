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
import {
	checkShopPermission,
} from "@/features/shops/utils";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export const getAvailableProductsAction = authenticatedAction(
	shopIdSchema,
	async (data, { session }) => {
		const authorized = await checkShopPermission(
			session.userId,
			session.permissions,
			data.shopId,
			"MANAGE_EVENTS"
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
			"MANAGE_EVENTS"
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
			"MANAGE_EVENTS"
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
