import { PaymentProvider, PaymentResult, WebhookResult } from "../types";

interface HelloAssoConfig {
	clientId: string;
	clientSecret: string;
	organizationSlug: string;
	baseUrl: string; // e.g., https://api.helloasso.com/v5
	appUrl: string; // For callbacks
}

interface HelloAssoFees {
	fixed: number;
	percentage: number;
}

export class HelloAssoAdapter implements PaymentProvider {
	private token: string | null = null;
	private tokenExpiresAt: number = 0;

	constructor(private config: HelloAssoConfig, private fees: HelloAssoFees) {}


	private calculateTotalCharge(desiredAmountCents: number): number {
		const percentageDecimal = this.fees.percentage / 100;
		// Formula: X = (Amount + Fixed) / (1 - Percentage)
		const total =
			(desiredAmountCents + this.fees.fixed) / (1 - percentageDecimal);
		return Math.ceil(total);
	}

	private async getAccessToken(): Promise<string> {
		// Check if token is valid (with 60s buffer)
		if (this.token && Date.now() < this.tokenExpiresAt - 60000) {
			return this.token;
		}

        if(!this.config.clientId || !this.config.clientSecret) {
            throw new Error("HelloAsso config not found");
        }

		console.log("[HelloAsso] Fetching new access token...");
		const params = new URLSearchParams();
		params.append("grant_type", "client_credentials");
		params.append("client_id", this.config.clientId);
		params.append("client_secret", this.config.clientSecret);

        const authURL = process.env.NODE_ENV === "production" ? "https://api.helloasso.com/oauth2/token" : "https://api.helloasso-sandbox.com/oauth2/token";

		const response = await fetch(authURL, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params,
		});

		if (!response.ok) {
			const text = await response.text();
			console.error("[HelloAsso] Auth Failed:", text);
			throw new Error(`HelloAsso Auth Failed: ${response.statusText}`);
		}

		const data = await response.json();
		this.token = data.access_token;
		// expires_in is in seconds
		this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
		return this.token!;
	}

	async createPayment(
		amountCents: number,
		description: string,
		internalTransactionId: string,
		_providerOptions?: Record<string, string> // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<PaymentResult> {
		try {
			const token = await this.getAccessToken();

			// Calculate amount with fees
			const totalAmountCents = this.calculateTotalCharge(amountCents);

			// Helper to create absolute URLs
			const makeUrl = (path: string, params: Record<string, string> = {}) => {
				const url = new URL(`${this.config.appUrl}${path}`);
				for (const [key, value] of Object.entries(params)) {
					url.searchParams.append(key, value);
				}
				return url.toString();
			};



			// Note: HelloAsso expects amounts in CENTS.
			const body = {
				totalAmount: totalAmountCents,
				initialAmount: totalAmountCents,
				itemName: description,
				backUrl: makeUrl("/topup/fail"),
				errorUrl: makeUrl("/topup/fail"),
				returnUrl: makeUrl("/topup/success"),
				containsDonation: false,
				metadata: {
					internalTransactionId,
				},
			};

			console.log(
				`[HelloAsso] Initiating payment for ${totalAmountCents} cents (Net: ${amountCents})`
			);

			const response = await fetch(
				`${this.config.baseUrl}/organizations/${this.config.organizationSlug}/checkout-intents`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(body),
				}
			);

			if (!response.ok) {
				const text = await response.text();
				console.error("[HelloAsso] API Error:", { status: response.status, statusText: response.statusText, responseBody: text, requestBody: body });
				throw new Error(`HelloAsso Error: ${response.statusText}`);
			}

			const data = await response.json();

			return {
				paymentId: data.id.toString(),
				redirectUrl: data.redirectUrl,
				totalAmountCents: totalAmountCents,
			};
		} catch (e: unknown) {
			const errorMessage = e instanceof Error ? e.message : "Unknown error";
			console.error("[HelloAsso] Create Payment Failed:", e);
			throw new Error(`HelloAsso Payment Failed: ${errorMessage}`);
		}
	}

    // Docs : https://dev.helloasso.com/docs/notifications-webhook
	async verifyWebhook(request: Request): Promise<WebhookResult> {
		try {
			const body = await request.json();
			const url = new URL(request.url);
			const internalId = body.metadata.internalTransactionId;

			console.log("[HelloAsso] Received webhook for order:", internalId);
			console.log("[HelloAsso] Webhook body:", body);
			

			if (!internalId) {
				console.log("[HelloAsso] Missing internal transaction ID");
				return { isValid: false };
			}

			const originIp = process.env.NODE_ENV === "production" ? "51.138.206.200" : "4.233.135.234"

			// Skip IP check for now
			// if (request.headers.get("x-forwarded-for") !== originIp) {
			// 	console.log("[HelloAsso] Invalid IP");
			// 	return { isValid: false };
			// }

			// Handle Payment events
			if (body.eventType === "Payment") {
				const paymentData = body.data;
				
				// Check if payment is authorized
				if (paymentData.state === "Authorized") {
					return {
						isValid: true,
						transactionId: internalId,
						amount: paymentData.amount, // Amount is in cents
						providerTransactionId: paymentData.id.toString(),
					};
				}
			}

			return { isValid: false };
		} catch (e) {
			console.error("[HelloAsso] Webhook verification failed", e);
			return { isValid: false };
		}
	}
}
