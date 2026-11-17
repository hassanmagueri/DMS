export type PaymentRecord = {
  id: number;
  deliveryId: number;
  customerId: number;
  amount: string;
  currency: string;
  method: string;
  status: string;
  provider: string;
  checkoutUrl: string | null;
  createdAt: string;
  attempts: { id: number; status: string; failureReason: string | null; createdAt: string }[];
  refunds: { id: number; amount: string; currency: string; status: string; reason: string | null; createdAt: string }[];
};

export function deliveryPayLabel(payment: { status: string } | null) {
  if (!payment) return "Due on delivery";
  return paymentStatusLabel(payment.status);
}

export function paymentStatusLabel(status: string) {
  if (status === "PENDING") return "Due on delivery";
  if (status === "SUCCEEDED") return "Collected";
  if (status === "PARTIALLY_REFUNDED") return "Partially refunded";
  if (status === "REFUNDED") return "Refunded";
  return status.replaceAll("_", " ");
}

export function paymentStatusNote(status: string) {
  if (status === "PENDING") return "Pay the driver in cash when the parcel is handed over.";
  if (status === "SUCCEEDED") return "The driver recorded this cash payment.";
  if (status === "PARTIALLY_REFUNDED") return "Part of this payment has been returned.";
  if (status === "REFUNDED") return "This payment has been refunded.";
  return "Pay on delivery.";
}
