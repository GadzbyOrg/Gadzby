import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { purchaseSelfService } from "@/features/shops/self-service";
import { rateLimit, withIdempotency } from "@/lib/api-auth";
import { requireApiUser } from "@/lib/api-user-auth";
import { getApiUserProfile } from "@/lib/api-user-profile";
import { findAppError } from "@/lib/errors";

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
	if (!auth.success) {
		return NextResponse.json({ error: auth.error }, { status: auth.status });
	}

	const { keyRecord, userId } = auth;
	const limitRes = await rateLimit(req, keyRecord.id, 30, 60000);
	if (!limitRes.success) {
		return NextResponse.json({ error: limitRes.error }, { status: limitRes.status });
	}

	let body;
	try {
		const text = await req.text();
		body = text ? JSON.parse(text) : {};
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	return withIdempotency(req, keyRecord.id, body, async () => {
		const parsed = purchaseSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid payload", details: parsed.error.issues },
				{ status: 400 },
			);
		}

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
			const appError = findAppError(error);
			if (appError) {
				return NextResponse.json(
					{ error: appError.message },
					{ status: appError.status },
				);
			}

			Sentry.captureException(error);
			console.error("API self-service purchase error:", error);
			return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
		}
	});
}
