import { AppError } from "../../lib/errors";

export const PAYMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "REQUIRES_ACTION",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const transitions: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PROCESSING", "SUCCEEDED", "CANCELLED"],
  PROCESSING: ["SUCCEEDED", "FAILED", "CANCELLED", "REQUIRES_ACTION"],
  REQUIRES_ACTION: ["PROCESSING", "SUCCEEDED", "FAILED", "CANCELLED"],
  SUCCEEDED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  FAILED: ["PROCESSING"],
  CANCELLED: ["PROCESSING"],
  PARTIALLY_REFUNDED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  REFUNDED: [],
};

export function assertPaymentTransition(from: string, to: PaymentStatus) {
  const allowed = transitions[from as PaymentStatus];
  if (!allowed?.includes(to)) {
    throw new AppError(409, `Cannot change payment from ${from} to ${to}`);
  }
}
