import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AppError } from "../../../lib/errors";
import type { PaymentProvider, ProviderEvent } from "./payment-provider";
import { assertSignature } from "./signature";

const eventSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.enum(["payment.succeeded", "payment.failed"]),
  sessionId: z.string().min(1).max(255),
  amount: z.string().regex(/^\d+\.\d{2}$/),
  currency: z.string().length(3),
});

function webOrigin() {
  return process.env.WEB_ORIGIN || process.env.CORS_ORIGIN || "http://localhost:3000";
}

export const mockPaymentProvider: PaymentProvider = {
  name: "mock",

  async createCheckoutSession(input) {
    const sessionId = `mock_${randomUUID()}`;
    const checkoutUrl = `${webOrigin()}/payments/mock-checkout?session=${encodeURIComponent(sessionId)}&paymentId=${encodeURIComponent(input.paymentId)}`;
    return { sessionId, checkoutUrl };
  },

  verifyWebhook(rawBody, signature): ProviderEvent {
    assertSignature(rawBody, signature);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new AppError(400, "Invalid payment event");
    }
    const event = eventSchema.safeParse(parsed);
    if (!event.success) throw new AppError(400, "Invalid payment event");
    return event.data;
  },

  async refund() {
    return { providerRefundId: `refund_${randomUUID()}`, status: "SUCCEEDED" };
  },
};
