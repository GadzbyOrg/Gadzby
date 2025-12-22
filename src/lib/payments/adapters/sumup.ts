import { PaymentProvider, PaymentResult, WebhookResult } from "../types";

interface SumUpConfig {
  vendorToken: string;
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
    // Formula: Total = (Amount + Fixed) / (1 - Percentage)
    const total =
      (desiredAmountCents + this.fees.fixed) / (1 - percentageDecimal);
    // Return rounded up integer (cents)
    return Math.ceil(total);
  }

  async createPayment(
    amountCents: number,
    _email: string, // SumUp doesn't strictly adhere to email for checkout creation in this flow necessarily, but could be passed if needed for customer
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

    // 2. Build Return URL
    const returnUrl = `${this.config.appUrl}/dashboard/topup/success`;

    // 3. Prepare Payload
    const payload = {
      checkout_reference: internalTransactionId,
      amount: parseFloat(amountFloat),
      currency: "EUR",
      merchant_code: this.config.merchantCode,
      description: description,
      return_url: returnUrl,
      hosted_checkout: {
        enabled: true,
      },
    };

    // 4. Call SumUp API
    try {
      const response = await fetch(`${this.apiEndpoint}/checkouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.vendorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[SumUp] API Error:", data);
        throw new Error(
          `SumUp Error: ${data.message || data.error_message || "Unknown"}`
        );
      }

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
      // SumUp sends the checkout resource or similar event data.
      // We need to verify by fetching the checkout details.
      const payload = await request.json();
      
      // Depending on webhook structure, extract ID.
      // Common structure: { id: "...", type: "checkout.status_changed", ... } or directly the checkout object?
      // Documentation implies we verify by fetching checkout.
      // Let's assume payload has 'id' or we look for 'checkout_id' from query params if passed?
      // NOTE: SumUp Webhooks usually send the event.
      // Let's assume we receive an ID we can check.
      
      const checkoutId = payload.id || payload.checkout_id;

      if (!checkoutId) {
         console.error("[SumUp] Webhook received without ID");
         return { isValid: false };
      }

      // Verify by fetching from SumUp
      const response = await fetch(`${this.apiEndpoint}/checkouts/${checkoutId}`, {
         method: "GET",
         headers: {
             Authorization: `Bearer ${this.config.vendorToken}`,
         }
      });

      if (!response.ok) {
          console.error("[SumUp] Failed to verify webhook via API");
          return { isValid: false };
      }

      const checkout = await response.json();

      // Check status
      if (checkout.status === "PAID") {
          return {
              isValid: true,
              transactionId: checkout.checkout_reference, // internal ID
              amount: checkout.amount, // Note: this is total amount usually.
              providerTransactionId: checkout.id
          };
      } else {
        // Valid webhook, but not paid
        return { isValid: false };
      }

    } catch (e) {
      console.error("[SumUp] Webhook verification error", e);
      return { isValid: false };
    }
  }
}
