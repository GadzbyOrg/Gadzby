import { PaymentProvider, PaymentResult, WebhookResult } from "../types";

interface LydiaConfig {
  vendorToken: string; 
  privateToken: string; 
  baseUrl: string;
}

interface LydiaFees {
  fixed: number; // in cents
  percentage: number; 
}

export class LydiaAdapter implements PaymentProvider {
  private apiEndpoint: string;

  constructor(private config: LydiaConfig, private fees: LydiaFees) {
    // Determine API URL based on environment
    if(process.env.NODE_ENV === 'development') {
        this.apiEndpoint = 'https://homologation.lydia-app.com/api/request/do.json';
    } else {
        this.apiEndpoint = 'https://lydia-app.com/api/request/do.json';
    }
}

  /**
   * Reverse calculation: How much should we charge so that after fees,
   * we receive exactly `desiredAmountCents`.
   */
  private calculateTotalCharge(desiredAmountCents: number): number {
    const percentageDecimal = this.fees.percentage / 100;
    // Formula: Total = (Amount + Fixed) / (1 - Percentage)
    const total = (desiredAmountCents + this.fees.fixed) / (1 - percentageDecimal);
    // Return rounded up integer (cents)
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

    console.log(`[Lydia] Initiating payment. User pays: ${amountFloat}€ (Target: ${amountCents/100}€)`);

    // 2. Build Callback URLs
    const successUrl = `${this.config.baseUrl}/dashboard/topup/success`;
    const cancelUrl = `${this.config.baseUrl}/dashboard/topup/cancel`;
    const confirmUrl = `${this.config.baseUrl}/api/webhooks/payment?provider=lydia`; // Generic webhook route

    // 3. Prepare Form Data (Lydia uses x-www-form-urlencoded, NOT JSON)
    const formData = new URLSearchParams();
    formData.append("vendor_token", this.config.vendorToken);
    formData.append("amount", amountFloat);
    formData.append("recipient", recipientNumber); 
    formData.append("order_ref", internalTransactionId); 
    formData.append("browser_success_url", successUrl);
    formData.append("browser_cancel_url", cancelUrl);
    formData.append("confirm_url", confirmUrl); 
    formData.append("sale_desc", description);
    formData.append("currency", "EUR");
    formData.append("type", "phone"); 

    // 4. Call Lydia API
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      // Lydia returns error: "0" for success (as string or number)
      if (data.error && data.error !== "0" && data.error !== 0) {
        console.error("[Lydia] API Error:", data);
        throw new Error(`Lydia Error: ${data.message || "Unknown"}`);
      }

      return {
        paymentId: data.request_id, // Lydia's ID
        redirectUrl: data.mobile_url, // Where we send the user
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

      // Extract key fields
      const orderRef = data.order_ref as string; // Our internal ID
      const requestId = data.request_id as string;
      // const amount = data.amount as string;
      const sig = data.sig as string; 

      if (!orderRef || !sig) {
        return { isValid: false };
      }

      // TODO: Implement Signature Verification
      // Lydia signs parameters using the Private Token. 
      // For now, we assume valid if order_ref exists.

      return {
        isValid: true,
        transactionId: orderRef, 
        providerTransactionId: requestId,
      };

    } catch (e) {
      console.error("[Lydia] Webhook parsing error", e);
      return { isValid: false };
    }
  }
}
