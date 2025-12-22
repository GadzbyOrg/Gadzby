export interface PaymentResult {
  paymentId: string;
  redirectUrl: string;
  totalAmountCents: number; // The amount charged to the user (including fees)
}

export interface WebhookResult {
  isValid: boolean;
  transactionId?: string; // The internal transaction ID
  amount?: number; // The amount credited (without fees)
  providerTransactionId?: string;
}

export interface PaymentProvider {
  /**
   * Creates a payment order.
   * @param amountCents The amount the user wants to receive in their wallet (net amount).
   * @param email User email.
   * @param description Payment description.
   * @param internalTransactionId Our internal transaction ID (uuid).
   */
  createPayment(
    amountCents: number,
    email: string,
    description: string,
    internalTransactionId: string
  ): Promise<PaymentResult>;

  /**
   * Verifies the webhook signature and content.
   * @param request The incoming request object (for headers/body).
   */
  verifyWebhook(request: Request): Promise<WebhookResult>;
}
