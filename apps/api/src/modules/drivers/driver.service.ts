import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { listDeliveries } from "../deliveries/delivery.service";
import { createStaffAccount } from "../users/account.service";
import { syncAllDriverPresence, syncDriverPresence } from "./presence";

const ACTIVE = ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

function toDriver(
  row: {
    id: bigint;
    license_number: string;
    status: string;
    users: {
      id: bigint;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string;
      username: string;
      enabled: boolean;
    };
    vehicle: { id: bigint; brand: string; model: string; plate_number: string; type: string } | null;
  },
  stats: { active: number; completed: number; ratingAverage: number | null; ratingCount: number },
) {
  return {
    id: Number(row.id),
    licenseNumber: row.license_number,
    status: row.status,
    activeDeliveries: stats.active,
    completedDeliveries: stats.completed,
    ratingAverage: stats.ratingAverage,
    ratingCount: stats.ratingCount,
    user: {
      id: Number(row.users.id),
      firstName: row.users.first_name,
      lastName: row.users.last_name,
      email: row.users.email,
      phone: row.users.phone,
      username: row.users.username,
      enabled: row.users.enabled,
    },
    vehicle: row.vehicle
      ? {
          id: Number(row.vehicle.id),
          brand: row.vehicle.brand,
          model: row.vehicle.model,
          plateNumber: row.vehicle.plate_number,
          type: row.vehicle.type,
        }
      : null,
  };
}

const driverInclude = {
  users: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      username: true,
      enabled: true,
    },
  },
  vehicle: true,
} as const;

type DriverRow = Prisma.driversGetPayload<{ include: typeof driverInclude }>;

async function withStats(rows: DriverRow[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [activeGroups, deliveredGroups, ratingGroups] = await Promise.all([
    prisma.deliveries.groupBy({
      by: ["driver_id"],
      where: { driver_id: { in: ids }, status: { in: [...ACTIVE] } },
      _count: { _all: true },
    }),
    prisma.deliveries.groupBy({
      by: ["driver_id"],
      where: { driver_id: { in: ids }, status: "DELIVERED" },
      _count: { _all: true },
    }),
    prisma.driver_ratings.groupBy({
      by: ["driver_id"],
      where: { driver_id: { in: ids } },
      _avg: { score: true },
      _count: { _all: true },
    }),
  ]);
  const active = new Map(activeGroups.flatMap((group) => (group.driver_id == null ? [] : [[group.driver_id, group._count._all] as const])));
  const completed = new Map(
    deliveredGroups.flatMap((group) => (group.driver_id == null ? [] : [[group.driver_id, group._count._all] as const])),
  );
  const ratings = new Map(
    ratingGroups.flatMap((group) =>
      group.driver_id == null ? [] : [[group.driver_id, { average: group._avg.score, count: group._count._all }] as const],
    ),
  );
  return rows.map((row) => {
    const rating = ratings.get(row.id);
    const ratingCount = rating?.count ?? 0;
    const ratingAverage =
      ratingCount && rating?.average != null ? Math.round(Number(rating.average) * 10) / 10 : null;
    return toDriver(row, {
      active: active.get(row.id) ?? 0,
      completed: completed.get(row.id) ?? 0,
      ratingAverage,
      ratingCount,
    });
  });
}

export async function listDrivers(query: {
  q?: string;
  status?: string;
  assignable?: boolean;
  page: number;
  pageSize: number;
}) {
  await syncAllDriverPresence();
  const filters: Prisma.driversWhereInput[] = [];
  if (query.status) filters.push({ status: query.status });
  if (query.assignable) {
    filters.push({ status: { not: "OFFLINE" } });
    filters.push({ users: { enabled: true } });
  }
  const q = query.q?.trim();
  if (q) {
    filters.push({
      OR: [
        { license_number: { contains: q, mode: "insensitive" } },
        { users: { first_name: { contains: q, mode: "insensitive" } } },
        { users: { last_name: { contains: q, mode: "insensitive" } } },
        { users: { email: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  const where = filters.length ? { AND: filters } : {};
  const skip = (query.page - 1) * query.pageSize;
  const [total, rows] = await prisma.$transaction([
    prisma.drivers.count({ where }),
    prisma.drivers.findMany({
      where,
      include: driverInclude,
      orderBy: { id: "asc" },
      skip,
      take: query.pageSize,
    }),
  ]);
  return {
    items: await withStats(rows),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

export async function myDriver(userId: bigint) {
  const row = await prisma.drivers.findUnique({
    where: { user_id: userId },
    include: driverInclude,
  });
  if (!row) throw new AppError(403, "Driver profile not found");

  const [drivers, active, recent] = await Promise.all([
    withStats([row]),
    listDeliveries({
      page: 1,
      pageSize: 50,
      driverId: row.id,
      statuses: [...ACTIVE],
    }),
    listDeliveries({
      page: 1,
      pageSize: 20,
      driverId: row.id,
      statuses: ["DELIVERED", "FAILED", "CANCELLED"],
    }),
  ]);

  return { driver: drivers[0], deliveries: [...active.items, ...recent.items] };
}

async function driverRow(id: bigint) {
  const row = await prisma.drivers.findUnique({ where: { id }, include: driverInclude });
  if (!row) throw new AppError(404, "Driver not found");
  return row;
}

async function driverById(id: bigint) {
  const [driver] = await withStats([await driverRow(id)]);
  return driver;
}

export async function createDriver(input: {
  firstName: string;
  lastName: string;
  username: string;
  email?: string | null;
  phone: string;
  password: string;
  licenseNumber: string;
}) {
  const user = await createStaffAccount({ ...input, role: "DRIVER" });
  const row = await prisma.drivers.findUnique({ where: { user_id: user.id }, include: driverInclude });
  if (!row) throw new AppError(500, "Driver profile was not created");
  const [driver] = await withStats([row]);
  return driver;
}

export async function updateDriver(
  id: bigint,
  input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    enabled?: boolean;
    password?: string;
  },
) {
  const driver = await driverRow(id);
  const password = input.password ? await bcrypt.hash(input.password, 10) : undefined;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: driver.user_id },
        data: {
          first_name: input.firstName?.trim(),
          last_name: input.lastName?.trim(),
          email: input.email?.trim(),
          phone: input.phone?.trim(),
          password,
          enabled: input.enabled,
          status:
            input.enabled === false ? "DISABLED" : input.enabled === true ? "ACTIVE" : undefined,
          updated_at: new Date(),
        },
      });

      const license = input.licenseNumber?.trim();
      if (license || input.enabled === false) {
        await tx.drivers.update({
          where: { id },
          data: {
            ...(license ? { license_number: license } : {}),
            ...(input.enabled === false ? { status: "OFFLINE" as const } : {}),
          },
        });
      }
      if (input.enabled === false) {
        await tx.tokens.updateMany({ where: { user_id: driver.user_id }, data: { revoked: true } });
      }
    });
    if (input.enabled !== false) await syncDriverPresence(driver.user_id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Email, phone, or license is already in use");
    }
    throw error;
  }

  return driverById(id);
}

const OPEN_DELIVERY = ["PENDING", "ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

export async function deleteDriver(id: bigint) {
  const driver = await prisma.drivers.findUnique({ where: { id } });
  if (!driver) throw new AppError(404, "Driver not found");
  const open = await prisma.deliveries.count({
    where: { driver_id: id, status: { in: OPEN_DELIVERY } },
  });
  if (open > 0) {
    throw new AppError(409, "This driver still has a delivery in progress. Finish or reassign it first.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.deliveries.updateMany({ where: { driver_id: id }, data: { driver_id: null } });
    await tx.driver_ratings.deleteMany({ where: { driver_id: id } });
    await tx.delivery_events.updateMany({ where: { actor_id: driver.user_id }, data: { actor_id: null } });
    await tx.refunds.updateMany({ where: { actor_id: driver.user_id }, data: { actor_id: null } });
    await tx.tokens.deleteMany({ where: { user_id: driver.user_id } });
    await tx.users_roles.deleteMany({ where: { user_id: driver.user_id } });
    await tx.vehicle.updateMany({ where: { driver_id: id }, data: { driver_id: null } });
    await tx.driver_locations.deleteMany({ where: { driver_id: id } });
    await tx.drivers.delete({ where: { id } });
    await tx.users.delete({ where: { id: driver.user_id } });
  });
}
