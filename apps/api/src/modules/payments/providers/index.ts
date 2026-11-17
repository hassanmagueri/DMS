import { AppError } from "../../../lib/errors";
import { mockPaymentProvider } from "./mock-payment-provider";
import type { PaymentProvider } from "./payment-provider";

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER || "mock";
  if (name === "mock") return mockPaymentProvider;
  throw new AppError(500, `Payment provider ${name} is not configured`);
}
