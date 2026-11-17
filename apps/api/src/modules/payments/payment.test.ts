import "dotenv/config";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";

process.env.NODE_ENV = "test";
process.env.PAYMENT_PROVIDER = "mock";
process.env.PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "dev-mock-webhook-secret";
process.env.PAYMENT_CURRENCY = "MAD";

type Json = Record<string, unknown>;

let server: Server;
let base = "";
const deliveryIds: bigint[] = [];

async function request(path: string, options: RequestInit = {}, token?: string) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const text = await response.text();
  let data: Json | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as Json;
    } catch {
      data = { message: text };
    }
  }
  return { status: response.status, data };
}

const sessions = new Map<string, string>();

async function login(email: string) {
  const cached = sessions.get(email);
  if (cached) return cached;
  const account = await prisma.users.findUnique({ where: { email }, select: { username: true } });
  assert.ok(account, `No user for ${email}`);
  const result = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: account.username, password: "Admin123!" }),
  });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  const token = result.data?.token as string;
  sessions.set(email, token);
  return token;
}

async function createDelivery(token: string) {
  const result = await request(
    "/api/deliveries",
    {
      method: "POST",
      body: JSON.stringify({
        weight: 2,
        pickup: { street: "1 Pay St", city: "Rabat", country: "Morocco" },
        dropoff: { street: "2 Pay Ave", city: "Casablanca", country: "Morocco" },
      }),
    },
    token,
  );
  assert.equal(result.status, 201, JSON.stringify(result.data));
  const id = BigInt(String((result.data as { id: number }).id));
  deliveryIds.push(id);
  return Number(id);
}

before(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind a port");
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  for (const deliveryId of deliveryIds) {
    const payment = await prisma.payments.findUnique({ where: { delivery_id: deliveryId } });
    if (payment) {
      await prisma.refunds.deleteMany({ where: { payment_id: payment.id } });
      await prisma.payment_webhook_events.deleteMany({ where: { payment_id: payment.id } });
      await prisma.payment_attempts.deleteMany({ where: { payment_id: payment.id } });
      await prisma.payments.delete({ where: { id: payment.id } });
    }
    const delivery = await prisma.deliveries.findUnique({ where: { id: deliveryId } });
    if (!delivery) continue;
    await prisma.delivery_events.deleteMany({ where: { delivery_id: deliveryId } });
    await prisma.deliveries.delete({ where: { id: deliveryId } });
    for (const addressId of [delivery.pickup_address_id, delivery.dropoff_address_id]) {
      const used = await prisma.deliveries.count({
        where: { OR: [{ pickup_address_id: addressId }, { dropoff_address_id: addressId }] },
      });
      if (used === 0) await prisma.addresses.delete({ where: { id: addressId } });
    }
  }
  const drivers = await prisma.drivers.findMany();
  for (const driver of drivers) {
    if (driver.status === "OFFLINE") continue;
    const active = await prisma.deliveries.count({
      where: { driver_id: driver.id, status: { in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"] } },
    });
    const next = active > 0 ? "ON_DELIVERY" : "AVAILABLE";
    if (driver.status !== next) {
      await prisma.drivers.update({ where: { id: driver.id }, data: { status: next } });
    }
  }
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await prisma.$disconnect();
});

describe("payments", { concurrency: false }, () => {
  it("rejects an unauthenticated payment read", async () => {
    const result = await request("/api/payments/1");
    assert.equal(result.status, 401);
  });

  it("rejects online card checkout", async () => {
    const alice = await login("alice.smith@example.com");
    const deliveryId = await createDelivery(alice);
    const checkout = await request(
      "/api/payments/checkout",
      {
        method: "POST",
        headers: { "idempotency-key": `card-payment-${deliveryId}` },
        body: JSON.stringify({ deliveryId, method: "CARD" }),
      },
      alice,
    );
    assert.equal(checkout.status, 400);
  });

  it("records cash collection and supports partial then full refunds", async () => {
    const alice = await login("alice.smith@example.com");
    const dispatcher = await login("dispatch@dms.io");
    const admin = await login("admin@dms.io");
    const deliveryId = await createDelivery(alice);
    const checkout = await request(
      "/api/payments/checkout",
      {
        method: "POST",
        headers: { "idempotency-key": `cash-payment-${deliveryId}` },
        body: JSON.stringify({ deliveryId, method: "CASH_ON_DELIVERY" }),
      },
      alice,
    );
    assert.equal(checkout.status, 201, JSON.stringify(checkout.data));
    const payment = (checkout.data as { payment: { id: number; status: string; checkoutUrl: string | null } }).payment;
    assert.equal(payment.status, "PENDING");
    assert.equal(payment.checkoutUrl, null);
    assert.equal((checkout.data as { payment: { method: string } }).payment.method, "CASH_ON_DELIVERY");

    const bob = await login("bob.jones@example.com");
    const hidden = await request(`/api/payments/${payment.id}`, {}, bob);
    assert.equal(hidden.status, 404);

    await login("john.driver@dms.io");
    const drivers = await request("/api/drivers", {}, dispatcher);
    const driverRows = (drivers.data as { items?: { id: number; status: string; user: { email: string } }[] }).items ?? [];
    const driver = driverRows.find((row) => row.user.email === "john.driver@dms.io");
    assert.ok(driver);
    assert.notEqual(driver.status, "OFFLINE");
    const assigned = await request(
      `/api/deliveries/${deliveryId}/assign`,
      { method: "POST", body: JSON.stringify({ driverId: driver.id }) },
      dispatcher,
    );
    assert.equal(assigned.status, 200, JSON.stringify(assigned.data));
    const driverToken = await login(driver.user.email);
    const accepted = await request(`/api/deliveries/${deliveryId}/accept`, { method: "POST" }, driverToken);
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));

    const collected = await request(`/api/payments/${payment.id}/collect-cash`, { method: "POST" }, dispatcher);
    assert.equal(collected.status, 200, JSON.stringify(collected.data));
    assert.equal((collected.data as { status: string }).status, "SUCCEEDED");

    const partial = await request(
      `/api/payments/${payment.id}/refund`,
      { method: "POST", body: JSON.stringify({ amount: "10.00", reason: "Partial return" }) },
      admin,
    );
    assert.equal(partial.status, 200, JSON.stringify(partial.data));
    assert.equal((partial.data as { status: string }).status, "PARTIALLY_REFUNDED");

    const full = await request(
      `/api/payments/${payment.id}/refund`,
      { method: "POST", body: JSON.stringify({ amount: "20.00", reason: "Rest" }) },
      admin,
    );
    assert.equal(full.status, 200, JSON.stringify(full.data));
    assert.equal((full.data as { status: string }).status, "REFUNDED");
  });
});
