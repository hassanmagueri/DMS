import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { sendMail } from "../../lib/mail";
import { nextId, prisma } from "../../lib/prisma";
import { syncDriverPresenceById } from "../drivers/presence";
import { quoteDelivery } from "../pricing/pricing.service";
import {
  ACTIVE,
  ASSIGNABLE,
  DELIVERY_STATUSES,
  DETAIL_EDITABLE,
  failureReasonLabels,
  nextStatuses,
  type DeliveryStatus,
} from "./delivery.schema";

const deliveryInclude = {
  users: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
    },
  },
  drivers: {
    include: {
      users: {
        select: { id: true, first_name: true, last_name: true, email: true, phone: true },
      },
      driver_locations: true,
    },
  },
  addresses_deliveries_pickup_address_idToaddresses: true,
  addresses_deliveries_dropoff_address_idToaddresses: true,
  proof_actor: { select: { first_name: true, last_name: true } },
  payments: { select: { id: true, amount: true, currency: true, status: true } },
  driver_ratings: { select: { score: true, created_at: true } },
  delivery_events: {
    orderBy: { created_at: "asc" as const },
    include: { users: { select: { first_name: true, last_name: true } } },
  },
} satisfies Prisma.deliveriesInclude;

export const deliveryListInclude = {
  ...deliveryInclude,
  delivery_events: {
    take: 0,
    orderBy: { created_at: "asc" as const },
    include: { users: { select: { first_name: true, last_name: true } } },
  },
} satisfies Prisma.deliveriesInclude;

type DeliveryRow = Prisma.deliveriesGetPayload<{ include: typeof deliveryInclude }>;

function blankToNull(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : null;
}

function toAddress(address: DeliveryRow["addresses_deliveries_pickup_address_idToaddresses"]) {
  return {
    id: Number(address.id),
    street: address.street,
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    country: address.country,
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

function canSeeLocation(role: string | undefined, status: string) {
  if (role === "ADMIN" || role === "DISPATCHER") return true;
  if (role === "CUSTOMER" || role === "DRIVER") return ACTIVE.includes(status as (typeof ACTIVE)[number]);
  return false;
}

export function toDelivery(row: DeliveryRow, viewerRole?: string) {
  const location = row.drivers?.driver_locations;
  const showLocation = Boolean(location) && canSeeLocation(viewerRole, row.status);
  return {
    id: Number(row.id),
    weight: row.weight,
    status: row.status,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
    customer: {
      id: Number(row.users.id),
      firstName: row.users.first_name,
      lastName: row.users.last_name,
      email: row.users.email,
      phone: row.users.phone,
    },
    driver: row.drivers
      ? {
          id: Number(row.drivers.id),
          userId: Number(row.drivers.users.id),
          status: row.drivers.status,
          licenseNumber: row.drivers.license_number,
          firstName: row.drivers.users.first_name,
          lastName: row.drivers.users.last_name,
          email: row.drivers.users.email,
          phone: row.drivers.users.phone,
          location: showLocation
            ? {
                latitude: location!.latitude,
                longitude: location!.longitude,
                updatedAt: location!.updated_at,
              }
            : null,
        }
      : null,
    pickup: toAddress(row.addresses_deliveries_pickup_address_idToaddresses),
    dropoff: toAddress(row.addresses_deliveries_dropoff_address_idToaddresses),
    proof: {
      code: viewerRole === "CUSTOMER" && !row.proof_confirmed_at ? row.confirmation_code : null,
      confirmedAt: row.proof_confirmed_at,
      confirmedBy: row.proof_actor ? `${row.proof_actor.first_name} ${row.proof_actor.last_name}` : null,
    },
    payment: row.payments
      ? {
          id: Number(row.payments.id),
          amount: row.payments.amount.toFixed(2),
          currency: row.payments.currency,
          status: row.payments.status,
        }
      : null,
    failureReason: row.failure_reason,
    rating: row.driver_ratings
      ? { score: row.driver_ratings.score, createdAt: row.driver_ratings.created_at }
      : null,
    timeline: row.delivery_events.map((event) => ({
      id: Number(event.id),
      fromStatus: event.from_status,
      toStatus: event.to_status,
      note: event.note,
      createdAt: event.created_at,
      actor: event.users ? `${event.users.first_name} ${event.users.last_name}` : null,
    })),
  };
}

async function nextConfirmationCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const existing = await tx.deliveries.findUnique({ where: { confirmation_code: code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new AppError(500, "Could not create a confirmation code");
}

async function recordEvent(
  tx: Prisma.TransactionClient,
  input: { deliveryId: bigint; actorId: bigint; fromStatus: string | null; toStatus: string; note?: string },
) {
  await tx.delivery_events.create({
    data: {
      id: await nextId("delivery_events_id_seq"),
      delivery_id: input.deliveryId,
      actor_id: input.actorId,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      note: input.note ?? null,
    },
  });
}

async function refreshDriverAvailability(driverId: bigint | null, tx: Prisma.TransactionClient) {
  if (!driverId) return;
  await syncDriverPresenceById(driverId, tx);
}

export async function listDeliveries(query: {
  q?: string;
  status?: string;
  statuses?: string[];
  page: number;
  pageSize: number;
  driverId?: bigint;
  customerId?: bigint;
}) {
  const filters: Prisma.deliveriesWhereInput[] = [];
  if (query.driverId) {
    filters.push({ driver_id: query.driverId });
    filters.push({ status: { not: "REJECTED" } });
  }
  if (query.customerId) filters.push({ customer_id: query.customerId });
  if (query.statuses?.length) filters.push({ status: { in: query.statuses } });
  else if (query.status && query.status !== "ALL") filters.push({ status: query.status });

  const q = query.q?.trim();
  if (q) {
    const or: Prisma.deliveriesWhereInput[] = [
      { users: { first_name: { contains: q, mode: "insensitive" } } },
      { users: { last_name: { contains: q, mode: "insensitive" } } },
      { users: { email: { contains: q, mode: "insensitive" } } },
      { addresses_deliveries_pickup_address_idToaddresses: { city: { contains: q, mode: "insensitive" } } },
      { addresses_deliveries_dropoff_address_idToaddresses: { city: { contains: q, mode: "insensitive" } } },
    ];
    if (/^\d+$/.test(q)) or.push({ id: BigInt(q) });
    filters.push({ OR: or });
  }

  const where = filters.length ? { AND: filters } : {};
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows] = await prisma.$transaction([
    prisma.deliveries.count({ where }),
    prisma.deliveries.findMany({
      where,
      include: deliveryListInclude,
      orderBy: { created_at: "desc" },
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map((row) => toDelivery(row)),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

export async function getDelivery(
  id: bigint,
  scope?: { driverId?: bigint; customerId?: bigint; role?: string },
) {
  const row = await prisma.deliveries.findUnique({ where: { id }, include: deliveryInclude });
  if (!row) throw new AppError(404, "Delivery not found");
  if (scope?.driverId && row.driver_id !== scope.driverId) throw new AppError(404, "Delivery not found");
  if (scope?.customerId && row.customer_id !== scope.customerId) throw new AppError(404, "Delivery not found");
  return toDelivery(row, scope?.role);
}

function placeLine(address: { street: string; city: string; state: string | null; postalCode: string | null; country: string }) {
  return [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(", ");
}

async function sendNotice(to: string | null | undefined, subject: string, text: string) {
  if (!to) return;
  try {
    await sendMail(to, subject, text);
  } catch {
    // The delivery is already saved. A mail problem must not roll it back.
  }
}

async function notifyDispatchers(delivery: Awaited<ReturnType<typeof getDelivery>>) {
  const dispatchers = await prisma.users.findMany({
    where: { role: "DISPATCHER", enabled: true },
    select: { email: true },
  });
  const text = [
    `Delivery #${delivery.id} is waiting for a driver.`,
    `Customer: ${delivery.customer.firstName} ${delivery.customer.lastName}`,
    `Pickup: ${placeLine(delivery.pickup)}`,
    `Drop-off: ${placeLine(delivery.dropoff)}`,
  ].join("\n");
  await Promise.all(dispatchers.map((row) => sendNotice(row.email, `Delivery #${delivery.id} needs a driver`, text)));
}

async function notifyAssignedDriver(delivery: Awaited<ReturnType<typeof getDelivery>>) {
  if (!delivery.driver) return;
  const text = [
    `Delivery #${delivery.id} is assigned to you.`,
    `Customer: ${delivery.customer.firstName} ${delivery.customer.lastName}`,
    `Pickup: ${placeLine(delivery.pickup)}`,
    `Drop-off: ${placeLine(delivery.dropoff)}`,
  ].join("\n");
  await sendNotice(delivery.driver.email, `Delivery #${delivery.id} is assigned to you`, text);
}

async function notifyCustomerArrived(delivery: Awaited<ReturnType<typeof getDelivery>>) {
  const text = [
    `Delivery #${delivery.id} has arrived.`,
    `Drop-off: ${placeLine(delivery.dropoff)}`,
    "Pay the driver in cash if the amount is still due.",
  ].join("\n");
  await sendNotice(delivery.customer.email, `Delivery #${delivery.id} has arrived`, text);
}

export async function createDelivery(input: {
  customerId: number;
  weight: number;
  pickup: { street: string; city: string; state?: string; postalCode?: string; country: string };
  dropoff: { street: string; city: string; state?: string; postalCode?: string; country: string };
}) {
  const customer = await prisma.users.findUnique({ where: { id: BigInt(input.customerId) } });
  if (!customer || customer.role !== "CUSTOMER") {
    throw new AppError(400, "Choose a customer");
  }
  if (!customer.enabled) {
    throw new AppError(400, "That customer account is disabled");
  }

  const pickupId = await nextId("addresses_id_seq");
  const dropoffId = await nextId("addresses_id_seq");
  const deliveryId = await nextId("deliveries_id_seq");
  const paymentId = await nextId("payments_id_seq");
  const attemptId = await nextId("payment_attempts_id_seq");
  const quote = quoteDelivery(input.weight);

  const addressData = (
    id: bigint,
    address: { street: string; city: string; state?: string; postalCode?: string; country: string },
  ) => ({
    id,
    street: address.street.trim(),
    city: address.city.trim(),
    state: blankToNull(address.state),
    postal_code: blankToNull(address.postalCode),
    country: address.country.trim(),
  });

  await prisma.$transaction(async (tx) => {
    await tx.addresses.create({ data: addressData(pickupId, input.pickup) });
    await tx.addresses.create({ data: addressData(dropoffId, input.dropoff) });
    await tx.deliveries.create({
      data: {
        id: deliveryId,
        customer_id: customer.id,
        pickup_address_id: pickupId,
        dropoff_address_id: dropoffId,
        weight: input.weight,
        status: "PENDING",
        confirmation_code: await nextConfirmationCode(tx),
      },
    });
    await recordEvent(tx, {
      deliveryId,
      actorId: customer.id,
      fromStatus: null,
      toStatus: "PENDING",
      note: "Delivery requested",
    });
    await tx.payments.create({
      data: {
        id: paymentId,
        delivery_id: deliveryId,
        customer_id: customer.id,
        amount: quote.amount,
        currency: quote.currency,
        method: "CASH_ON_DELIVERY",
        status: "PENDING",
        provider: "cash",
        idempotency_key: `delivery-${deliveryId}`,
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

  const delivery = await getDelivery(deliveryId, { role: "ADMIN" });
  await notifyDispatchers(delivery);
  return delivery;
}

export async function updateDelivery(
  deliveryId: bigint,
  actorId: bigint,
  input: {
    customerId?: number;
    weight?: number;
    pickup?: { street: string; city: string; state?: string; postalCode?: string; country: string };
    dropoff?: { street: string; city: string; state?: string; postalCode?: string; country: string };
  },
) {
  const delivery = await prisma.deliveries.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new AppError(404, "Delivery not found");
  if (!DETAIL_EDITABLE.includes(delivery.status as (typeof DETAIL_EDITABLE)[number])) {
    throw new AppError(400, "This delivery can no longer be edited");
  }

  let customerId = delivery.customer_id;
  if (input.customerId) {
    const customer = await prisma.users.findUnique({ where: { id: BigInt(input.customerId) } });
    if (!customer || customer.role !== "CUSTOMER" || !customer.enabled) {
      throw new AppError(400, "Choose an enabled customer");
    }
    customerId = customer.id;
  }

  const addressData = (address: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  }) => ({
    street: address.street.trim(),
    city: address.city.trim(),
    state: blankToNull(address.state),
    postal_code: blankToNull(address.postalCode),
    country: address.country.trim(),
  });

  await prisma.$transaction(async (tx) => {
    if (input.pickup) {
      await tx.addresses.update({ where: { id: delivery.pickup_address_id }, data: addressData(input.pickup) });
    }
    if (input.dropoff) {
      await tx.addresses.update({ where: { id: delivery.dropoff_address_id }, data: addressData(input.dropoff) });
    }
    await tx.deliveries.update({
      where: { id: deliveryId },
      data: {
        customer_id: customerId,
        weight: input.weight,
      },
    });
    await recordEvent(tx, {
      deliveryId,
      actorId,
      fromStatus: delivery.status,
      toStatus: delivery.status,
      note: "Delivery details updated",
    });
  });

  return getDelivery(deliveryId, { role: "ADMIN" });
}

export async function deleteDelivery(deliveryId: bigint) {
  const delivery = await prisma.deliveries.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new AppError(404, "Delivery not found");

  await prisma.$transaction(async (tx) => {
    await tx.delivery_events.deleteMany({ where: { delivery_id: deliveryId } });
    await tx.deliveries.delete({ where: { id: deliveryId } });
    for (const addressId of [delivery.pickup_address_id, delivery.dropoff_address_id]) {
      const stillUsed = await tx.deliveries.count({
        where: {
          OR: [{ pickup_address_id: addressId }, { dropoff_address_id: addressId }],
        },
      });
      if (stillUsed === 0) await tx.addresses.delete({ where: { id: addressId } });
    }
    await refreshDriverAvailability(delivery.driver_id, tx);
  });
}

export async function assignDriver(deliveryId: bigint, driverId: number, actorId: bigint) {
  const driver = await prisma.drivers.findUnique({
    where: { id: BigInt(driverId) },
    include: { users: { select: { enabled: true } } },
  });
  if (!driver) throw new AppError(400, "Choose a driver");
  if (!driver.users.enabled) throw new AppError(400, "That driver account is disabled");
  await syncDriverPresenceById(driver.id);
  const fresh = await prisma.drivers.findUnique({ where: { id: driver.id }, select: { status: true } });
  if (!fresh || fresh.status === "OFFLINE") throw new AppError(400, "That driver is offline");

  const previous = await prisma.deliveries.findUnique({ where: { id: deliveryId } });
  if (!previous) throw new AppError(404, "Delivery not found");
  if (!ASSIGNABLE.includes(previous.status as (typeof ASSIGNABLE)[number])) {
    throw new AppError(400, "This delivery can no longer be assigned");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.deliveries.updateMany({
      where: { id: deliveryId, status: { in: [...ASSIGNABLE] } },
      data: { driver_id: driver.id, status: "ASSIGNED", failure_reason: null },
    });
    if (updated.count !== 1) throw new AppError(409, "Another dispatcher already updated this delivery");
    await recordEvent(tx, {
      deliveryId,
      actorId,
      fromStatus: previous.status,
      toStatus: "ASSIGNED",
      note: "Driver assigned",
    });
    await refreshDriverAvailability(previous.driver_id, tx);
    await refreshDriverAvailability(driver.id, tx);
  });

  const delivery = await getDelivery(deliveryId, { role: "ADMIN" });
  await notifyAssignedDriver(delivery);
  return delivery;
}

export async function updateStatus(
  deliveryId: bigint,
  status: DeliveryStatus,
  actor: { role: string; userId: bigint },
  confirmationCode?: string,
  failureReason?: string,
) {
  const delivery = await prisma.deliveries.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new AppError(404, "Delivery not found");

  let driverId = delivery.driver_id;
  if (actor.role === "DRIVER") {
    const driver = await prisma.drivers.findUnique({ where: { user_id: actor.userId } });
    if (!driver || delivery.driver_id !== driver.id) {
      throw new AppError(403, "You can only update your own deliveries");
    }
    driverId = driver.id;
  }
  if (actor.role === "CUSTOMER" && delivery.customer_id !== actor.userId) {
    throw new AppError(403, "You can only update your own deliveries");
  }

  if (!DELIVERY_STATUSES.includes(delivery.status as DeliveryStatus)) {
    throw new AppError(400, "This delivery has an unknown status");
  }
  if (!nextStatuses(delivery.status, actor.role).includes(status)) {
    throw new AppError(400, `Cannot change ${delivery.status} to ${status}`);
  }
  if (status === "DELIVERED") {
    if (!confirmationCode) throw new AppError(400, "Enter the 6-digit code from the customer");
    if (confirmationCode !== delivery.confirmation_code) {
      throw new AppError(400, "That code does not match this delivery");
    }
  }
  if (status === "FAILED" && !failureReason) {
    throw new AppError(400, "Choose why the delivery failed");
  }

  const confirmedAt = status === "DELIVERED" ? new Date() : null;
  const failureLabel = failureReason ? failureReasonLabels[failureReason as keyof typeof failureReasonLabels] : null;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.deliveries.updateMany({
      where: { id: deliveryId, status: delivery.status },
      data: {
        status,
        driver_id: status === "PENDING" ? null : undefined,
        delivered_at: status === "DELIVERED" ? confirmedAt : delivery.delivered_at,
        proof_confirmed_at: status === "DELIVERED" ? confirmedAt : undefined,
        proof_confirmed_by: status === "DELIVERED" ? actor.userId : undefined,
        failure_reason: status === "FAILED" ? failureReason : undefined,
      },
    });
    if (updated.count !== 1) throw new AppError(409, "This delivery changed. Refresh and try again");
    await recordEvent(tx, {
      deliveryId,
      actorId: actor.userId,
      fromStatus: delivery.status,
      toStatus: status,
      note:
        status === "DELIVERED"
          ? "Customer code confirmed"
          : status === "FAILED" && failureLabel
            ? `Failed: ${failureLabel}`
            : status === "PENDING"
              ? "Sent again after a failed attempt"
              : undefined,
    });
    await refreshDriverAvailability(driverId, tx);
  });

  const updated = await getDelivery(deliveryId, { role: actor.role });
  if (status === "DELIVERED") await notifyCustomerArrived(updated);
  if (status === "PENDING") await notifyDispatchers(updated);
  return updated;
}

export async function respondToAssignment(deliveryId: bigint, actorId: bigint, accept: boolean) {
  const driver = await driverForUser(actorId);
  const delivery = await prisma.deliveries.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.driver_id !== driver.id) throw new AppError(404, "Delivery not found");
  if (delivery.status !== "ASSIGNED") throw new AppError(400, "This assignment is no longer waiting for a response");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.deliveries.updateMany({
      where: { id: deliveryId, driver_id: driver.id, status: "ASSIGNED" },
      data: accept ? { status: "ACCEPTED" } : { status: "REJECTED", driver_id: null },
    });
    if (updated.count !== 1) throw new AppError(409, "This assignment was already handled");
    await recordEvent(tx, {
      deliveryId,
      actorId,
      fromStatus: "ASSIGNED",
      toStatus: accept ? "ACCEPTED" : "REJECTED",
      note: accept ? "Driver accepted" : "Driver rejected. Returned to the assignment queue",
    });
    await refreshDriverAvailability(driver.id, tx);
  });

  if (!accept) {
    return { id: Number(deliveryId), status: "REJECTED" };
  }
  return getDelivery(deliveryId, { driverId: driver.id, role: "DRIVER" });
}

export async function rateDelivery(deliveryId: bigint, customerId: bigint, score: number) {
  const delivery = await prisma.deliveries.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.customer_id !== customerId) throw new AppError(404, "Delivery not found");
  if (!delivery.proof_confirmed_at || !delivery.driver_id) {
    throw new AppError(400, "You can rate the driver after the delivery code is confirmed");
  }
  const existing = await prisma.driver_ratings.findUnique({ where: { delivery_id: deliveryId } });
  if (existing) throw new AppError(409, "This delivery is already rated");

  await prisma.driver_ratings.create({
    data: {
      id: await nextId("driver_ratings_id_seq"),
      delivery_id: deliveryId,
      driver_id: delivery.driver_id,
      customer_id: customerId,
      score,
    },
  });
  return getDelivery(deliveryId, { customerId, role: "CUSTOMER" });
}

export async function shareLocation(userId: bigint, latitude: number, longitude: number) {
  const driver = await driverForUser(userId);
  await prisma.driver_locations.upsert({
    where: { driver_id: driver.id },
    create: { driver_id: driver.id, latitude, longitude },
    update: { latitude, longitude, updated_at: new Date() },
  });
  return { latitude, longitude };
}

export async function driverForUser(userId: bigint) {
  const driver = await prisma.drivers.findUnique({ where: { user_id: userId } });
  if (!driver) throw new AppError(403, "Driver profile not found");
  return driver;
}
