import jwt from "jsonwebtoken";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ACTIVE } from "../deliveries/delivery.schema";

type Db = Prisma.TransactionClient | typeof prisma;

function tokenIsLive(token: string | null, revoked: boolean | null) {
  if (!token || revoked) return false;
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string" || typeof decoded.exp !== "number") return false;
  return decoded.exp * 1000 > Date.now();
}

async function nextPresence(userId: bigint, driverId: bigint, enabled: boolean, db: Db) {
  if (!enabled) return "OFFLINE" as const;
  const tokens = await db.tokens.findMany({
    where: { user_id: userId, revoked: false },
    select: { token: true, revoked: true },
  });
  const online = tokens.some((row) => tokenIsLive(row.token, row.revoked));
  if (!online) return "OFFLINE" as const;
  const active = await db.deliveries.count({
    where: { driver_id: driverId, status: { in: [...ACTIVE] } },
  });
  return active > 0 ? ("ON_DELIVERY" as const) : ("AVAILABLE" as const);
}

export async function syncDriverPresence(userId: bigint, db: Db = prisma) {
  const driver = await db.drivers.findUnique({
    where: { user_id: userId },
    select: { id: true, status: true, users: { select: { enabled: true } } },
  });
  if (!driver) return;
  const next = await nextPresence(userId, driver.id, driver.users.enabled, db);
  if (next === driver.status) return;
  await db.drivers.update({ where: { id: driver.id }, data: { status: next } });
}

export async function syncDriverPresenceById(driverId: bigint, db: Db = prisma) {
  const driver = await db.drivers.findUnique({ where: { id: driverId }, select: { user_id: true } });
  if (!driver) return;
  await syncDriverPresence(driver.user_id, db);
}

export async function syncAllDriverPresence() {
  const drivers = await prisma.drivers.findMany({
    select: { id: true, user_id: true, status: true, users: { select: { enabled: true } } },
  });
  if (drivers.length === 0) return;

  const tokens = await prisma.tokens.findMany({
    where: { user_id: { in: drivers.map((driver) => driver.user_id) }, revoked: false },
    select: { user_id: true, token: true, revoked: true },
  });
  const live = new Set<string>();
  for (const row of tokens) {
    if (row.user_id && tokenIsLive(row.token, row.revoked)) live.add(row.user_id.toString());
  }

  const activeRows = await prisma.deliveries.groupBy({
    by: ["driver_id"],
    where: { driver_id: { in: drivers.map((driver) => driver.id) }, status: { in: [...ACTIVE] } },
    _count: { _all: true },
  });
  const activeByDriver = new Map(activeRows.map((row) => [row.driver_id?.toString(), row._count._all]));

  const updates = drivers.flatMap((driver) => {
    const online = driver.users.enabled && live.has(driver.user_id.toString());
    const active = activeByDriver.get(driver.id.toString()) ?? 0;
    const next = !online ? "OFFLINE" : active > 0 ? "ON_DELIVERY" : "AVAILABLE";
    if (next === driver.status) return [];
    return [prisma.drivers.update({ where: { id: driver.id }, data: { status: next } })];
  });
  if (updates.length > 0) await prisma.$transaction(updates);
}
