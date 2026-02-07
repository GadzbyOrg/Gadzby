import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { getPaymentProvider } from "@/lib/payments/factory";

export async function POST(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const providerSlug = searchParams.get("provider");

		if (!providerSlug) {
			console.log("Missing provider param");
			return NextResponse.json(
				{ error: "Missing provider param" },
				{ status: 400 }
			);
		}

		const provider = await getPaymentProvider(providerSlug);
		if (!provider) {
			console.log("Invalid provider");
			return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
		}

		//console.log("Received webhook for provider:", providerSlug);
		const verification = await provider.verifyWebhook(request);

		if (!verification.isValid || !verification.transactionId) {
			//console.log("Invalid webhook verification");
			return NextResponse.json(
				{ error: "Invalid signature or missing tx ID" },
				{ status: 400 }
			);
		}

		const txId = verification.transactionId;

		// TODO: Refactor to use transactions service
		await db.transaction(async (tx) => {
			// 1. Get current transaction status
			const [currentTx] = await tx
				.select()
				.from(transactions)
				.where(eq(transactions.id, txId))
				.for("update"); // Lock row

			if (!currentTx) {
				throw new Error("Transaction not found");
			}

			if (currentTx.status === "COMPLETED") {
				console.log(`Transaction ${txId} already completed. Ignoring.`);
				return;
			}

			// 2. Update transaction
			await tx
				.update(transactions)
				.set({ status: "COMPLETED" })
				.where(eq(transactions.id, txId));

			// 3. Credit User Balance
			const amountToCredit = currentTx.amount;

			await tx
				.update(users)
				.set({
					balance: sql`${users.balance} + ${amountToCredit}`,
				})
				.where(eq(users.id, currentTx.targetUserId));
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Webhook processing error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
