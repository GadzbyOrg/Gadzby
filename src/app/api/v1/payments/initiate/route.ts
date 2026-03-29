import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit, validateApiKey } from "@/lib/api-auth";
import { TransactionService } from "@/services/transaction-service";

const initiatePaymentSchema = z.object({
	senderId: z.string().uuid("Invalid sender ID"),
	receiverId: z.string().uuid("Invalid receiver ID"),
	amountInEuros: z.number().positive("Amount must be positive"),
	description: z.string().optional(),
});

export async function POST(req: NextRequest) {
	// Authentication
	const authRes = await validateApiKey(req);
	if (!authRes.success) {
		return NextResponse.json({ error: authRes.error }, { status: authRes.status });
	}

	const keyId = authRes.keyRecord!.id;

	// Rate Limiting (e.g. 30 payments per minute per API key)
	const limitRes = await rateLimit(req, keyId, 30, 60000);
	if (!limitRes.success) {
		return NextResponse.json({ error: limitRes.error }, { status: limitRes.status });
	}

	try {
        const body = await req.json();
		const parsed = initiatePaymentSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid payload", details: parsed.error.format() },
				{ status: 400 }
			);
		}

		const { senderId, receiverId, amountInEuros, description } = parsed.data;

        // Automatically prefix description to identify API origin
        const finalDescription = `[API - ${authRes.keyRecord!.name}] ${description || 'Paiement API'}`;

		// Using TransactionService to create standard transfer
		await TransactionService.transferUserToUser(
			senderId,
			receiverId,
			amountInEuros,
			finalDescription
		);

		return NextResponse.json({ success: true, message: "Payment successful" }, { status: 201 });
	} catch (error: any) {
		console.error("API Payment Error:", error);
		return NextResponse.json(
			{ error: error.message || "Internal Server Error" },
			{ status: 500 }
		);
	}
}
