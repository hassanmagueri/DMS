import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../../../lib/errors";

export function webhookSecret() {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) throw new AppError(500, "Payment webhook secret is not configured");
  return secret;
}

export function signPayload(rawBody: Buffer, secret = webhookSecret()) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function assertSignature(rawBody: Buffer, signature: string | undefined) {
  if (!signature) throw new AppError(400, "Missing payment signature");
  const expected = signPayload(rawBody);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new AppError(400, "Invalid payment signature");
  }
}
