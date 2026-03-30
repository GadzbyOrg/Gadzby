import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit, validateApiKey, withIdempotency } from "@/lib/api-auth";
import { TransactionService } from "@/services/transaction-service";

const purchaseItemSchema = z.object({
	productId: z.string().uuid(),
	quantity: z.number().int().positive(),
	variantId: z.string().uuid().optional()
});

const purchaseSchema = z.object({
	targetUserId: z.string().uuid(),
	items: z.array(purchaseItemSchema).min(1),
	paymentSource: z.enum(["PERSONAL", "FAMILY"]).default("PERSONAL"),
	famsId: z.string().uuid().optional(),
	descriptionPrefix: z.string().optional()
});

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ shopId: string }> }
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) {
		return NextResponse.json({ error: authRes.error }, { status: authRes.status });
	}

	const keyId = authRes.keyRecord!.id;
	// Stricter rate limit for purchases (e.g. 30/min)
	const limitRes = await rateLimit(req, keyId, 30, 60000); 
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

	return withIdempotency(req, keyId, body, async () => {
		try {
			const { shopId } = await params;
			
			const parsed = purchaseSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid payload", details: parsed.error.issues },
				{ status: 400 }
			);
		}

		const { targetUserId, items, paymentSource, famsId, descriptionPrefix } = parsed.data;

		if (paymentSource === "FAMILY" && !famsId) {
			return NextResponse.json(
				{ error: "famsId is required when paymentSource is FAMILY" },
				{ status: 400 }
			);
		}

		const prefix = descriptionPrefix || `[API - ${authRes.keyRecord!.name}] Achat`;

		// Using targetUserId as issuerId since they are initiating the purchase via the API
		await TransactionService.processShopPurchase(
			shopId,
			targetUserId,
			targetUserId,
			items,
			paymentSource,
			famsId,
			prefix
		);

		return NextResponse.json({ success: true }, { status: 201 });

	} catch (error: any) {
		console.error("API Purchase Error:", error);
		
		// Catch known service errors to return 400 instead of 500
		if (
			error instanceof Error && 
			(error.message.includes("Solde insuffisant") || 
			 error.message.includes("introuvable") || 
			 error.message.includes("invalide") || 
			 error.message.includes("désactivé"))
		) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
	});
}
