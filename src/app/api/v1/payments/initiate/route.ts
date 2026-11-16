import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit, validateApiKey, withIdempotency } from "@/lib/api-auth";
import {
	handleRouteError,
	jsonError,
	RATE_LIMITS,
	rateLimitResponse,
	readJsonBody,
	validationError,
} from "@/lib/api-http";
import { TransactionService } from "@/services/transaction-service";

const initiatePaymentSchema = z.object({
	senderId: z.string().uuid("Invalid sender ID"),
	receiverId: z.string().uuid("Invalid receiver ID"),
	amountInEuros: z.number().positive("Amount must be positive"),
	description: z.string().optional(),
});

export async function POST(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) return jsonError(authRes.status!, authRes.error!);

	const keyRecord = authRes.keyRecord!;
	const limitRes = await rateLimit(req, keyRecord.id, RATE_LIMITS.write);
	if (!limitRes.success) return rateLimitResponse(limitRes);

	const json = await readJsonBody(req);
	if (!json.ok) return json.response;

	return withIdempotency(req, keyRecord.id, json.body, async () => {
		const parsed = initiatePaymentSchema.safeParse(json.body);
		if (!parsed.success) return validationError(parsed.error);

		const { senderId, receiverId, amountInEuros, description } = parsed.data;

		try {
			// Préfixe systématique pour identifier l'origine API dans l'historique.
			await TransactionService.transferUserToUser(
				senderId,
				receiverId,
				amountInEuros,
				`[API - ${keyRecord.name}] ${description || "Paiement API"}`,
			);

			return NextResponse.json(
				{ success: true, message: "Payment successful" },
				{ status: 201 },
			);
		} catch (error) {
			// Erreurs métier (solde insuffisant…) → 400 via AppError, le reste → 500.
			return handleRouteError(error, "payments initiate");
		}
	});
}
