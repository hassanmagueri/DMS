import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AppError } from "../../lib/errors";
import { nextId, prisma } from "../../lib/prisma";
import { quoteDelivery } from "../pricing/pricing.service";
import { assertPaymentTransition, type PaymentStatus } from "./payment-state";
import { getPaymentProvider } from "./providers";
import { signPayload } from "./providers/signature";

const paymentInclude = {
  payment_attempts: { orderBy: { created_at: "desc" as const } },
  refunds: { orderBy: { created_at: "desc" as const } },
} satisfies Prisma.paymentsInclude;

type PaymentRow = Prisma.paymentsGetPayload<{ include: typeof paymentInclude }>;

function money(value: Prisma.Decimal | string) {
  return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function audit(event: string, details: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", audit: event, ...details }));
}

export function toPayment(row: PaymentRow) {
  const latest = row.payment_attempts[0] ?? null;
  return {
    id: Number(row.id),
    deliveryId: Number(row.delivery_id),
    customerId: Number(row.customer_id),
    amount: money(row.amount).toFixed(2),
    currency: row.currency,
    method: row.method,
    status: row.status,
    provider: row.provider,
    providerReference: row.provider_reference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    checkoutUrl: latest?.checkout_url ?? null,
    attempts: row.payment_attempts.map((attempt) => ({
      id: Number(attempt.id),
      status: attempt.status,
      providerSessionId: attempt.provider_session_id,
      checkoutUrl: attempt.checkout_url,
      failureReason: attempt.failure_reason,
      createdAt: attempt.created_at,
    })),
    refunds: row.refunds.map((refund) => ({
      id: Number(refund.id),
      amount: money(refund.amount).toFixed(2),
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
      providerRefundId: refund.provider_refund_id,
      createdAt: refund.created_at,
    })),
  };
}

async function loadPayment(id: bigint) {
  const row = await prisma.payments.findUnique({ where: { id }, include: paymentInclude });
  if (!row) throw new AppError(404, "Payment not found");
  return row;
}

function assertCustomerOwns(row: { customer_id: bigint }, actor: { userId: bigint; role: string }) {
  if (actor.role !== "CUSTOMER" || row.customer_id !== actor.userId) {
    throw new AppError(404, "Payment not found");
  }
}

function assertCanView(row: { customer_id: bigint }, actor: { userId: bigint; role: string }) {
  if (actor.role === "ADMIN" || actor.role === "DISPATCHER") return;
  if (actor.role === "CUSTOMER" && row.customer_id === actor.userId) return;
  throw new AppError(404, "Payment not found");
}

export async function createCheckout(
  actor: { userId: bigint; role: string },
  input: { deliveryId: number; method: "CASH_ON_DELIVERY" },
  idempotencyKey: string,
) {
  if (actor.role !== "CUSTOMER") throw new AppError(403, "Only a customer can start payment");
  if (input.method !== "CASH_ON_DELIVERY") throw new AppError(400, "Only pay on delivery is available");
  const key = idempotencyKey.trim();
  if (key.length < 8 || key.length > 128) throw new AppError(400, "Idempotency key is required");

  const existingKey = await prisma.payments.findUnique({ where: { idempotency_key: key }, include: paymentInclude });
  if (existingKey) {
    if (existingKey.customer_id !== actor.userId || Number(existingKey.delivery_id) !== input.deliveryId) {
      throw new AppError(409, "Idempotency key was already used");
    }
    return { payment: toPayment(existingKey), created: false };
  }

  const delivery = await prisma.deliveries.findUnique({ where: { id: BigInt(input.deliveryId) } });
  if (!delivery || delivery.customer_id !== actor.userId) throw new AppError(404, "Delivery not found");
  if (["CANCELLED", "DELIVERED", "FAILED"].includes(delivery.status)) {
    throw new AppError(400, "This delivery can no longer be paid");
  }

  const duplicateDelivery = await prisma.payments.findUnique({ where: { delivery_id: delivery.id } });
  if (duplicateDelivery) throw new AppError(409, "This delivery already has a payment");

  const quote = quoteDelivery(delivery.weight);
  const paymentId = await nextId("payments_id_seq");
  const attemptId = await nextId("payment_attempts_id_seq");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payments.create({
        data: {
          id: paymentId,
          delivery_id: delivery.id,
          customer_id: actor.userId,
          amount: money(quote.amount),
          currency: quote.currency,
          method: "CASH_ON_DELIVERY",
          status: "PENDING",
          provider: "cash",
          idempotency_key: key,
        },
      });
      await tx.payment_attempts.create({
        data: {
          id: attemptId,
          payment_id: paymentId,
          status: "PENDING",
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "This delivery already has a payment");
    }
    throw error;
  }

  audit("payment.created", { paymentId: Number(paymentId), method: "CASH_ON_DELIVERY", status: "PENDING" });
  return { payment: toPayment(await loadPayment(paymentId)), created: true };
}

export async function getPaymentForActor(id: bigint, actor: { userId: bigint; role: string }) {
  const row = await loadPayment(id);
  assertCanView(row, actor);
  return toPayment(row);
}

export async function getPaymentForDelivery(deliveryId: bigint, actor: { userId: bigint; role: string }) {
  const row = await prisma.payments.findUnique({ where: { delivery_id: deliveryId }, include: paymentInclude });
  if (!row) throw new AppError(404, "Payment not found");
  assertCanView(row, actor);
  return toPayment(row);
}

export async function listMyPayments(actor: { userId: bigint; role: string }) {
  if (actor.role !== "CUSTOMER") throw new AppError(403, "Only a customer can list their payments");
  const rows = await prisma.payments.findMany({
    where: { customer_id: actor.userId },
    include: paymentInclude,
    orderBy: { created_at: "desc" },
  });
  return rows.map(toPayment);
}

export async function retryPayment(_id: bigint, _actor: { userId: bigint; role: string }) {
  throw new AppError(400, "Online payment is not available");
}

export async function refundPayment(
  id: bigint,
  actor: { userId: bigint; role: string },
  input: { amount: string; reason?: string },
) {
  if (actor.role !== "ADMIN") throw new AppError(403, "Only an administrator can refund a payment");
  const row = await loadPayment(id);
  const requested = money(input.amount);
  if (requested.lessThanOrEqualTo(0)) throw new AppError(400, "Refund amount must be greater than 0");

  const already = row.refunds
    .filter((refund) => refund.status === "SUCCEEDED")
    .reduce((sum, refund) => sum.plus(money(refund.amount)), new Prisma.Decimal(0));
  const nextTotal = already.plus(requested);
  if (nextTotal.greaterThan(money(row.amount))) throw new AppError(400, "Refund exceeds the remaining amount");

  const nextStatus: PaymentStatus = nextTotal.equals(money(row.amount)) ? "REFUNDED" : "PARTIALLY_REFUNDED";
  assertPaymentTransition(row.status, nextStatus);

  const provider = row.method === "CARD" ? getPaymentProvider() : null;
  const providerRefund = provider
    ? await provider.refund({
        paymentId: String(row.id),
        providerReference: row.provider_reference,
        amount: requested.toFixed(2),
        currency: row.currency,
      })
    : { providerRefundId: `cash_refund_${randomUUID()}`, status: "SUCCEEDED" as const };

  const refundId = await nextId("refunds_id_seq");
  await prisma.$transaction(async (tx) => {
    const current = await tx.payments.findUnique({ where: { id: row.id }, include: { refunds: true } });
    if (!current) throw new AppError(404, "Payment not found");
    const paid = current.refunds
      .filter((refund) => refund.status === "SUCCEEDED")
      .reduce((sum, refund) => sum.plus(money(refund.amount)), new Prisma.Decimal(0));
    const total = paid.plus(requested);
    if (total.greaterThan(money(current.amount))) throw new AppError(409, "Refund exceeds the remaining amount");
    const status: PaymentStatus = total.equals(money(current.amount)) ? "REFUNDED" : "PARTIALLY_REFUNDED";
    assertPaymentTransition(current.status, status);
    await tx.refunds.create({
      data: {
        id: refundId,
        payment_id: row.id,
        amount: requested,
        currency: row.currency,
        status: "SUCCEEDED",
        reason: input.reason ?? null,
        actor_id: actor.userId,
        provider_refund_id: providerRefund.providerRefundId,
      },
    });
    await tx.payments.update({
      where: { id: row.id },
      data: { status, updated_at: new Date() },
    });
  });
  audit("payment.refunded", { paymentId: Number(row.id), amount: requested.toFixed(2), status: nextStatus });
  return toPayment(await loadPayment(row.id));
}

export async function collectCash(id: bigint, actor: { userId: bigint; role: string }) {
  if (!["ADMIN", "DISPATCHER", "DRIVER"].includes(actor.role)) {
    throw new AppError(403, "You cannot record cash collection");
  }
  const row = await loadPayment(id);
  if (row.method !== "CASH_ON_DELIVERY") throw new AppError(400, "This payment is not cash on delivery");
  assertPaymentTransition(row.status, "SUCCEEDED");

  if (actor.role === "DRIVER") {
    const driver = await prisma.drivers.findUnique({ where: { user_id: actor.userId } });
    const delivery = await prisma.deliveries.findUnique({ where: { id: row.delivery_id } });
    if (!driver || !delivery || delivery.driver_id !== driver.id) {
      throw new AppError(403, "You can only collect cash for your own delivery");
    }
  }

  const delivery = await prisma.deliveries.findUnique({ where: { id: row.delivery_id } });
  if (!delivery || !["ACCEPTED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(delivery.status)) {
    throw new AppError(409, "Cash can be collected after the driver accepts the delivery");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.payments.updateMany({
      where: { id: row.id, status: row.status, method: "CASH_ON_DELIVERY" },
      data: { status: "SUCCEEDED", provider_reference: "cash", updated_at: new Date() },
    });
    if (updated.count !== 1) throw new AppError(409, "This payment changed. Refresh and try again");
    await tx.payment_attempts.updateMany({
      where: { payment_id: row.id, status: "PENDING" },
      data: { status: "SUCCEEDED" },
    });
  });
  audit("payment.cash_collected", { paymentId: Number(row.id), actorId: Number(actor.userId) });
  return toPayment(await loadPayment(row.id));
}

export async function processWebhook(providerName: string, rawBody: Buffer, signature: string | undefined) {
  const provider = getPaymentProvider();
  if (provider.name !== providerName) throw new AppError(404, "Payment provider not found");
  const event = provider.verifyWebhook(rawBody, signature);

  const attempt = await prisma.payment_attempts.findUnique({
    where: { provider_session_id: event.sessionId },
    include: { payments: true },
  });
  if (!attempt) throw new AppError(404, "Payment session not found");

  const payment = attempt.payments;
  if (event.currency !== payment.currency || !money(event.amount).equals(money(payment.amount))) {
    audit("payment.webhook_rejected", { reason: "amount", eventId: event.id, paymentId: Number(payment.id) });
    throw new AppError(400, "Payment amount does not match the recorded amount");
  }

  const nextStatus: PaymentStatus = event.type === "payment.succeeded" ? "SUCCEEDED" : "FAILED";
  const eventId = await nextId("payment_webhook_events_id_seq");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment_webhook_events.create({
        data: {
          id: eventId,
          provider: provider.name,
          provider_event_id: event.id,
          payment_id: payment.id,
          payload: event,
          processed_at: new Date(),
        },
      });
      const currentAttempt = await tx.payment_attempts.findUnique({ where: { id: attempt.id } });
      const current = await tx.payments.findUnique({ where: { id: payment.id } });
      if (!currentAttempt || !current) throw new AppError(404, "Payment not found");
      if (currentAttempt.status !== "PROCESSING" || current.status === nextStatus) return;
      assertPaymentTransition(current.status, nextStatus);
      await tx.payments.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          provider_reference: event.type === "payment.succeeded" ? event.sessionId : current.provider_reference,
          updated_at: new Date(),
        },
      });
      await tx.payment_attempts.update({
        where: { id: attempt.id },
        data: {
          status: nextStatus,
          failure_reason: event.type === "payment.failed" ? "Provider reported a failed payment" : null,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      audit("payment.webhook_duplicate", { eventId: event.id });
      return { duplicate: true, payment: toPayment(await loadPayment(payment.id)) };
    }
    throw error;
  }

  audit("payment.webhook_processed", { eventId: event.id, paymentId: Number(payment.id), status: nextStatus });
  return { duplicate: false, payment: toPayment(await loadPayment(payment.id)) };
}

export async function completeMockCheckout(sessionId: string, outcome: "succeeded" | "failed") {
  const provider = getPaymentProvider();
  if (provider.name !== "mock") throw new AppError(404, "Mock checkout is not enabled");
  const attempt = await prisma.payment_attempts.findUnique({
    where: { provider_session_id: sessionId },
    include: { payments: true },
  });
  if (!attempt) throw new AppError(404, "Payment session not found");

  const event = {
    id: `evt_${randomUUID()}`,
    type: outcome === "succeeded" ? "payment.succeeded" : "payment.failed",
    sessionId,
    amount: money(attempt.payments.amount).toFixed(2),
    currency: attempt.payments.currency,
  };
  const rawBody = Buffer.from(JSON.stringify(event));
  const signature = signPayload(rawBody);
  return processWebhook(provider.name, rawBody, signature);
}
