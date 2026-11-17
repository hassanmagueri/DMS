import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";

const BASE_FEE = new Prisma.Decimal("20.00");
const PER_KG = new Prisma.Decimal("5.00");

export function currency() {
  return process.env.PAYMENT_CURRENCY || "MAD";
}

export function quoteDelivery(weight: number) {
  if (!Number.isFinite(weight) || weight <= 0) {
    throw new AppError(400, "Weight must be greater than 0");
  }
  const amount = BASE_FEE.plus(new Prisma.Decimal(weight).mul(PER_KG)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return {
    amount: amount.toFixed(2),
    currency: currency(),
    baseFee: BASE_FEE.toFixed(2),
    perKg: PER_KG.toFixed(2),
    weight,
  };
}
