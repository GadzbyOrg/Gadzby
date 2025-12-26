import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";
import { eq } from "drizzle-orm";
import { PaymentProvider } from "./types";
import { LydiaAdapter } from "./adapters/lydia";
import { SumUpAdapter } from "./adapters/sumup";

export async function getPaymentProvider(
	slug: string
): Promise<PaymentProvider | null> {
	const method = await db.query.paymentMethods.findFirst({
		where: eq(paymentMethods.slug, slug),
	});

	if (!method || !method.isEnabled) {
		return null;
	}

	// Cast config and fees to expected types
	const fees = method.fees as { fixed: number; percentage: number };
	const config = method.config as Record<string, string>;

	switch (slug) {
		case "lydia":
			// Validates config presence if needed
			return new LydiaAdapter(
				{
					vendorToken: config.vendorToken,
					privateToken: config.privateToken,
					baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
				},
				fees
			);
		case "sumup":
			return new SumUpAdapter(
				{
					sumup_api_key: config.sumup_api_key,
					merchantCode: config.merchantCode,
					appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
				},
				fees
			);
		default:
			return null;
	}
}
