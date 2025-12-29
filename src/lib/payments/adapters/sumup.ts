import { PaymentProvider, PaymentResult, WebhookResult } from "../types";

interface SumUpTransaction {
	id: string;
	status: "SUCCESSFUL" | "PENDING" | "FAILED";
	amount: number;
	currency: string;
	timestamp: string;
}

interface SumUpCheckoutResponse {
	id: string;
	checkout_reference: string;
	amount: number;
	currency: string;
	status: "PAID" | "PENDING" | "FAILED";
	hosted_checkout_url?: string;
	transactions?: SumUpTransaction[];
}

interface SumUpConfig {
	sumup_api_key: string;
	merchantCode: string;
	appUrl: string;
}

interface SumUpFees {
	fixed: number; // in cents
	percentage: number;
}

export class SumUpAdapter implements PaymentProvider {
	private apiEndpoint = "https://api.sumup.com/v0.1";

	constructor(private config: SumUpConfig, private fees: SumUpFees) {}

	/**
	 * Reverse calculation: How much should we charge so that after fees,
	 * we receive exactly `desiredAmountCents`.
	 */
	private calculateTotalCharge(desiredAmountCents: number): number {
		const percentageDecimal = this.fees.percentage / 100;
		const total =
			(desiredAmountCents + this.fees.fixed) / (1 - percentageDecimal);
		// Return rounded up integer (cents)
		return Math.ceil(total);
	}

	async createPayment(
		amountCents: number,
		description: string,
		internalTransactionId: string
	): Promise<PaymentResult> {
		// 1. Calculate the inflated amount (User pays fees)
		const totalAmountCents = this.calculateTotalCharge(amountCents);
		const amountFloat = (totalAmountCents / 100).toFixed(2);

		console.log(
			`[SumUp] Initiating payment. User pays: ${amountFloat}€ (Target: ${
				amountCents / 100
			}€)`
		);

		// 2. Build URLs
		// return_url is for server-side webhook notification
		const webhookUrl = `${this.config.appUrl}/api/webhooks/payment?provider=sumup`;
		// redirect_url is where the user is sent after payment (Hosted Checkout)
		const successUrl = `${this.config.appUrl}/topup/success`;

		// 3. Prepare Payload
		const payload = {
			checkout_reference: internalTransactionId,
			amount: parseFloat(amountFloat),
			currency: "EUR",
			merchant_code: this.config.merchantCode,
			description: description,
			return_url: webhookUrl,
			redirect_url: successUrl,
			hosted_checkout: { enabled: true },
		};

		// 4. Call SumUp API
		try {
			const response = await fetch(`${this.apiEndpoint}/checkouts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.config.sumup_api_key}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const data: SumUpCheckoutResponse = await response.json();

			console.log("[SumUp] API Response:", JSON.stringify(data));
			if (!response.ok) {
				console.error("[SumUp] API Error:", data);
				const errorData = data as any;
				throw new Error(
					`SumUp Error: ${
						errorData.message || errorData.error_message || "Unknown"
					}`
				);
			}

			if (!data.hosted_checkout_url) {
				console.error("[SumUp] No hosted checkout URL in response:", data);
				throw new Error("No hosted checkout URL returned by SumUp");
			}
			console.log("[SumUp] Payment created successfully:", data);
			return {
				paymentId: data.id,
				redirectUrl: data.hosted_checkout_url,
				totalAmountCents: totalAmountCents,
			};
		} catch (error) {
			console.error("[SumUp] Request Failed:", error);
			throw new Error("Failed to communicate with payment provider");
		}
	}

	async verifyWebhook(request: Request): Promise<WebhookResult> {
		try {
			const body = await request.json();

			console.log("[SumUp] Raw Webhook Body:", JSON.stringify(body));

			const checkoutId =
				body.payload?.checkout_id || body.id || body.object?.id;

			if (!checkoutId) {
				console.error("[SumUp] Webhook received without ID");
				return { isValid: false };
			}

			// Verify by fetching from SumUp
			const response = await fetch(
				`${this.apiEndpoint}/checkouts/${checkoutId}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${this.config.sumup_api_key}`,
					},
				}
			);

			if (!response.ok) {
				const err = await response.json();
				console.error("[SumUp] Webhook verification failed:", err);
				return { isValid: false };
			}

			const checkout: SumUpCheckoutResponse = await response.json();

			// Check status
			if (
				checkout.status === "PAID" ||
				(checkout.transactions &&
					checkout.transactions.some(
						(t: SumUpTransaction) => t.status === "SUCCESSFUL"
					))
			) {
				return {
					isValid: true,
					transactionId: checkout.checkout_reference, // internal ID
					amount: checkout.amount,
					providerTransactionId: checkout.id,
				};
			} else {
				return { isValid: false };
			}
		} catch (e) {
			console.error("[SumUp] Webhook verification error", e);
			return { isValid: false };
		}
	}
}
