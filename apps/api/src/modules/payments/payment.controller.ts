import type { Request, Response } from "express";
import { AppError } from "../../lib/errors";
import { checkoutSchema, mockCompleteSchema, refundSchema } from "./payment.schema";
import {
  collectCash,
  completeMockCheckout,
  createCheckout,
  getPaymentForActor,
  getPaymentForDelivery,
  listMyPayments,
  processWebhook,
  refundPayment,
  retryPayment,
} from "./payment.service";

function idParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) throw new AppError(400, "Invalid id");
  return BigInt(raw);
}

function actor(req: Request) {
  if (!req.auth) throw new AppError(401, "Sign in required");
  return req.auth;
}

export async function checkout(req: Request, res: Response) {
  const body = checkoutSchema.parse(req.body);
  const key = req.header("idempotency-key") ?? "";
  const result = await createCheckout(actor(req), body, key);
  res.status(result.created ? 201 : 200).json({ payment: result.payment, checkoutUrl: result.payment.checkoutUrl });
}

export async function show(req: Request, res: Response) {
  res.json(await getPaymentForActor(idParam(req.params.id), actor(req)));
}

export async function showForDelivery(req: Request, res: Response) {
  res.json(await getPaymentForDelivery(idParam(req.params.deliveryId), actor(req)));
}

export async function mine(req: Request, res: Response) {
  res.json(await listMyPayments(actor(req)));
}

export async function retry(req: Request, res: Response) {
  res.json(await retryPayment(idParam(req.params.id), actor(req)));
}

export async function refund(req: Request, res: Response) {
  const body = refundSchema.parse(req.body);
  res.json(await refundPayment(idParam(req.params.id), actor(req), body));
}

export async function collect(req: Request, res: Response) {
  res.json(await collectCash(idParam(req.params.id), actor(req)));
}

export async function webhook(req: Request, res: Response) {
  const provider = Array.isArray(req.params.provider) ? req.params.provider[0] : req.params.provider;
  if (!provider) throw new AppError(404, "Payment provider not found");
  const raw = req.rawBody;
  if (!raw) throw new AppError(400, "Missing payment body");
  const result = await processWebhook(provider, raw, req.header("x-payment-signature"));
  res.json({ received: true, duplicate: result.duplicate, status: result.payment.status });
}

export async function completeMock(req: Request, res: Response) {
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  if (!sessionId) throw new AppError(400, "Missing checkout session");
  const body = mockCompleteSchema.parse(req.body);
  const result = await completeMockCheckout(sessionId, body.outcome);
  res.json({ received: true, duplicate: result.duplicate, status: result.payment.status, paymentId: result.payment.id });
}
