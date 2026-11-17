export type CheckoutSessionInput = {
  paymentId: string;
  attemptId: string;
  amount: string;
  currency: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  sessionId: string;
  checkoutUrl: string;
};

export type ProviderEvent = {
  id: string;
  type: "payment.succeeded" | "payment.failed";
  sessionId: string;
  amount: string;
  currency: string;
};

export type ProviderRefundInput = {
  paymentId: string;
  providerReference: string | null;
  amount: string;
  currency: string;
};

export type ProviderRefundResult = {
  providerRefundId: string;
  status: "SUCCEEDED";
};

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  verifyWebhook(rawBody: Buffer, signature: string | undefined): ProviderEvent;
  refund(input: ProviderRefundInput): Promise<ProviderRefundResult>;
}
