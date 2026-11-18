import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { purchaseSelfService } from "@/features/shops/self-service";
import { rateLimit, withIdempotency } from "@/lib/api-auth";
import {
	handleRouteError,
	jsonError,
	RATE_LIMITS,
	rateLimitResponse,
	readJsonBody,
	validationError,
} from "@/lib/api-http";
import { requireApiUser } from "@/lib/api-user-auth";
import { getApiUserProfile } from "@/lib/api-user-profile";

const purchaseSchema = z.object({
	shopId: z.string().uuid(),
	items: z
		.array(
			z.object({
				productId: z.string().uuid(),
				quantity: z.number().int().positive(),
				variantId: z.string().uuid().optional(),
			}),
		)
		.min(1),
});

/** Achat self-service : l'utilisateur connecté se débite lui-même. */
export async function POST(req: NextRequest) {
	const auth = await requireApiUser(req);
	if (!auth.success) return jsonError(auth.status, auth.error);

	const { keyRecord, userId } = auth;
	const limitRes = await rateLimit(req, keyRecord.id, RATE_LIMITS.write);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const json = await readJsonBody(req);
	if (!json.ok) return json.response;

	return withIdempotency(req, keyRecord.id, json.body, async () => {
		const parsed = purchaseSchema.safeParse(json.body);
		if (!parsed.success) return validationError(parsed.error);

		try {
			await purchaseSelfService({
				shop: { id: parsed.data.shopId },
				userId,
				items: parsed.data.items,
				paymentSource: "PERSONAL",
				descriptionPrefix: `[API - ${keyRecord.name}] Achat`,
			});

			const user = await getApiUserProfile(userId);
			return NextResponse.json(
				{ success: true, balance: user?.balance ?? null },
				{ status: 201 },
			);
		} catch (error) {
			return handleRouteError(error, "me purchases");
		}
	});
}
