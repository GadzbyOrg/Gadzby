"use server";

import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { getPaymentProvider } from "@/lib/payments/factory";
import { eq } from "drizzle-orm";
import { authenticatedAction } from "@/lib/actions";
import { InitiateTopUpSchema } from "./schema";

export const initiateTopUp = authenticatedAction(
	InitiateTopUpSchema,
	async (data, { session }) => {
		const { providerSlug, amountCents } = data;

		console.log("Initiating top-up:", { providerSlug, amountCents });
		const user = await db.query.users.findFirst({
			where: eq(users.id, session.userId),
		});

		if (!user) {
			throw new Error("User not found");
		}

		const provider = await getPaymentProvider(providerSlug);
		if (!provider) {
			throw new Error("Invalid payment provider");
		}

		const [tx] = await db
			.insert(transactions)
			.values({
				amount: amountCents,
				type: "TOPUP",
				status: "PENDING",
				issuerId: user.id,
				targetUserId: user.id,
				description: `Rechargement via ${providerSlug}`,
				walletSource: "PERSONAL",
			})
			.returning({ id: transactions.id });

		if (!tx) {
			throw new Error("Failed to create transaction");
		}

		let paymentResult;
		try {
			paymentResult = await provider.createPayment(
				amountCents,
				user.email,
				`Rechargement compte Gadzby`,
				tx.id
			);
		} catch (error) {
			console.error("Error creating payment:", error);
			await db
				.update(transactions)
				.set({ status: "FAILED" })
				.where(eq(transactions.id, tx.id));
			throw error;
		}

		await db
			.update(transactions)
			.set({
				paymentProviderId: paymentResult.paymentId,
			})
			.where(eq(transactions.id, tx.id));

		return paymentResult.redirectUrl;
	}
);
