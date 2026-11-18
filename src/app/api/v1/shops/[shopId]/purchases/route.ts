import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { shops } from "@/db/schema";
import { rateLimit, validateApiKey, withIdempotency } from "@/lib/api-auth";
import {
	handleRouteError,
	jsonError,
	parseUuid,
	RATE_LIMITS,
	rateLimitResponse,
	readJsonBody,
	validationError,
} from "@/lib/api-http";
import { TransactionService } from "@/services/transaction-service";

const purchaseItemSchema = z.object({
	productId: z.string().uuid(),
	quantity: z.number().int().positive(),
	variantId: z.string().uuid().optional(),
});

const purchaseSchema = z.object({
	targetUserId: z.string().uuid(),
	items: z.array(purchaseItemSchema).min(1),
	paymentSource: z.enum(["PERSONAL", "FAMILY"]).default("PERSONAL"),
	famsId: z.string().uuid().optional(),
	descriptionPrefix: z.string().optional(),
});

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ shopId: string }> },
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const keyRecord = authRes.keyRecord!;
	const limitRes = await rateLimit(req, keyRecord.id, RATE_LIMITS.write);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const shopId = parseUuid((await params).shopId, "shopId");
	if (!shopId.ok) return shopId.response;

	const json = await readJsonBody(req);
	if (!json.ok) return json.response;

	return withIdempotency(req, keyRecord.id, json.body, async () => {
		const parsed = purchaseSchema.safeParse(json.body);
		if (!parsed.success) return validationError(parsed.error);

		const { targetUserId, items, paymentSource, famsId, descriptionPrefix } = parsed.data;
		if (paymentSource === "FAMILY" && !famsId) {
			return jsonError(400, "famsId is required when paymentSource is FAMILY");
		}

		try {
			const shop = await db.query.shops.findFirst({
				where: eq(shops.id, shopId.value),
				columns: { isActive: true },
			});
			if (!shop) return jsonError(404, "Shop not found");
			if (!shop.isActive) return jsonError(403, "Shop inactive");

			// L'utilisateur débité est aussi l'émetteur : l'achat passe par l'API.
			await TransactionService.processShopPurchase(
				shopId.value,
				targetUserId,
				targetUserId,
				items,
				paymentSource,
				famsId,
				descriptionPrefix || `[API - ${keyRecord.name}] Achat`,
			);

			return NextResponse.json({ success: true }, { status: 201 });
		} catch (error) {
			return handleRouteError(error, "shop purchase");
		}
	});
}
