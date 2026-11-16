import { eq } from "drizzle-orm";

import { db } from "@/db";
import { shops } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { TransactionService } from "@/services/transaction-service";

type SelfServiceItem = {
	productId: string;
	quantity: number;
	variantId?: string;
};

type SelfServicePurchase = {
	/** Le web identifie le shop par slug, l'API par id. */
	shop: { id: string } | { slug: string };
	userId: string;
	items: SelfServiceItem[];
	paymentSource: "PERSONAL" | "FAMILY";
	famsId?: string;
	descriptionPrefix: string;
};

/**
 * Achat en self-service : l'utilisateur se débite lui-même.
 * Règles communes à la page web et à l'API tierce.
 */
export async function purchaseSelfService({
	shop: shopRef,
	userId,
	items,
	paymentSource,
	famsId,
	descriptionPrefix,
}: SelfServicePurchase) {
	const shop = await db.query.shops.findFirst({
		where:
			"id" in shopRef ? eq(shops.id, shopRef.id) : eq(shops.slug, shopRef.slug),
	});

	if (!shop) throw new AppError("Shop introuvable", { status: 404 });

	if (!shop.isActive) throw new AppError("Ce shop est fermé", { status: 403 });

	if (!shop.isSelfServiceEnabled) {
		throw new AppError("Self-service désactivé pour ce shop", { status: 403 });
	}

	const productIds = items.map((i) => i.productId);
	const dbProducts = await db.query.products.findMany({
		where: (products, { inArray, and }) =>
			and(
				inArray(products.id, productIds),
				eq(products.shopId, shop.id),
				eq(products.allowSelfService, true),
			),
	});

	if (dbProducts.length !== new Set(productIds).size) {
		throw new AppError(
			"Certains produits ne sont pas disponibles en self-service",
		);
	}

	await TransactionService.processShopPurchase(
		shop.id,
		userId,
		userId,
		items,
		paymentSource,
		famsId,
		descriptionPrefix,
	);

	return shop;
}
