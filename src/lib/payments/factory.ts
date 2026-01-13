import { eq } from "drizzle-orm";

import { db } from "@/db";
import { paymentMethods } from "@/db/schema/payment-methods";

import { HelloAssoAdapter } from "./adapters/helloasso";
import { LydiaAdapter } from "./adapters/lydia";
import { SumUpAdapter } from "./adapters/sumup";
import { PaymentProvider } from "./types";

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
		case "helloasso":
			return new HelloAssoAdapter(
				{
					clientId: config.clientId,
					clientSecret: config.clientSecret,
					organizationSlug: config.organizationSlug,
					baseUrl: process.env.NODE_ENV === "production" ? "https://api.helloasso.com/v5" : "https://api.helloasso-sandbox.com/v5",
					appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
				},
				fees
			);
		default:
			return null;
	}
}
