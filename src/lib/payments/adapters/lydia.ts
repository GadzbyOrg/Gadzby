import { PaymentProvider, PaymentResult, WebhookResult } from "../types";
import * as crypto from "crypto";

interface LydiaConfig {
	vendorToken: string;
	privateToken: string;
	baseUrl: string;
}

interface LydiaFees {
	fixed: number; // in cents
	percentage: number;
}

interface LydiaInitiateResponse {
	error: string;
	request_id: string;
	message: string;
	mobile_url: string;
	web_url: string;
}

export class LydiaAdapter implements PaymentProvider {
	private apiEndpoint: string;

	constructor(private config: LydiaConfig, private fees: LydiaFees) {
		// Determine API URL based on environment
		if (process.env.NODE_ENV === "development") {
			this.apiEndpoint =
				"https://homologation.lydia-app.com/api/request/do.json";
		} else {
			this.apiEndpoint = "https://lydia-app.com/api/request/do.json";
		}
	}

	/**
	 * Reverse calculation: How much should we charge so that after fees,
	 * we receive exactly `desiredAmountCents`.
	 */
	private calculateTotalCharge(desiredAmountCents: number): number {
		const percentageDecimal = this.fees.percentage / 100;
		const total =
			(desiredAmountCents + this.fees.fixed) / (1 - percentageDecimal);
		return Math.ceil(total);
	}

	async createPayment(
		amountCents: number,
		recipientNumber: string, // phone number
		description: string,
		internalTransactionId: string
	): Promise<PaymentResult> {
		// 1. Calculate the inflated amount (User pays fees)
		const totalAmountCents = this.calculateTotalCharge(amountCents);
		const amountFloat = (totalAmountCents / 100).toFixed(2); // Lydia expects "10.50"

		console.log(
			`[Lydia] Initiating payment. User pays: ${amountFloat}€ (Target: ${
				amountCents / 100
			}€)`
		);

		// 2. Build Callback URLs
		const successUrl = `${this.config.baseUrl}/topup/success`;
		const failUrl = `${this.config.baseUrl}/dashboard/topup/fail`;
		const confirmUrl = `${this.config.baseUrl}/api/webhooks/payment?provider=lydia&order_id=${internalTransactionId}`; // Webhook URL

		// 3. Prepare Form Data (Lydia uses x-www-form-urlencoded, NOT JSON)
		const formData = new URLSearchParams();
		formData.append("vendor_token", this.config.vendorToken);
		formData.append("amount", amountFloat);
		formData.append("recipient", recipientNumber);
		formData.append("currency", "EUR");
		formData.append("message", description);
		formData.append("browser_success_url", successUrl);
		formData.append("browser_fail_url", failUrl);
		formData.append("callback_url", confirmUrl);

		// 4. Call Lydia API
		try {
			const response = await fetch(this.apiEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: formData.toString(),
			});

			const data = (await response.json()) as LydiaInitiateResponse;

			// Lydia returns error: "0" for success (as string or number)
			if (data.error && data.error !== "0") {
				console.error("[Lydia] API Error:", data);
				throw new Error(`Lydia Error: ${data.message || "Unknown"}`);
			}

			const webUrl = data.web_url as string;
			// TODO: If user is mobile, we can use mobile_url for a better experience
			// const mobileUrl = data.mobile_url as string;

			return {
				paymentId: data.request_id,
				redirectUrl: webUrl,
				totalAmountCents: totalAmountCents,
			};
		} catch (error) {
			console.error("[Lydia] Request Failed:", error);
			throw new Error("Failed to communicate with payment provider");
		}
	}

	async verifyWebhook(request: Request): Promise<WebhookResult> {
		try {
			// Lydia sends data as Form Data in POST
			const formData = await request.formData();
			const data = Object.fromEntries(formData);

			const request_id = data.request_id as string;
			const amount = data.amount as string;
			const currency = data.currency as string;
			const sig = data.sig as string;
			const signed = data.signed as string;
			const transaction_identifier = data.transaction_identifier as string; // Bank reference
			const vendor_token = data.vendor_token as string;

			const url = new URL(request.url);
			const order_ref = url.searchParams.get("order_id"); // Our internal transaction ID

			if (!request_id || !sig || !order_ref) {
				return { isValid: false };
			}

			// Signature Verification
			const signatureSource = `${currency}${request_id}${amount}${signed}${transaction_identifier}${vendor_token}${this.config.privateToken}`;
			const calculatedHash = crypto
				.createHash("md5")
				.update(signatureSource)
				.digest("hex");

			if (calculatedHash !== sig) {
				console.warn("[Lydia] Invalid signature", { calculatedHash, sig });
				return { isValid: false };
			}

			return {
				isValid: true,
				transactionId: order_ref,
				providerTransactionId: request_id,
			};
		} catch (e) {
			console.error("[Lydia] Webhook parsing error", e);
			return { isValid: false };
		}
	}
}
