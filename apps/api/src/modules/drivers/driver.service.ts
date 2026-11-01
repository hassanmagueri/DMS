import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { listDeliveries } from "../deliveries/delivery.service";
import { createStaffAccount } from "../users/account.service";

const ACTIVE = ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

function toDriver(row: {
  id: bigint;
  license_number: string;
  status: string;
  users: {
    id: bigint;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    username: string;
    enabled: boolean;
  };
  vehicle: { id: bigint; brand: string; model: string; plate_number: string; type: string } | null;
  deliveries: { status: string }[];
}) {
  return {
    id: Number(row.id),
    licenseNumber: row.license_number,
    status: row.status,
    activeDeliveries: row.deliveries.filter((item) => ACTIVE.includes(item.status)).length,
    completedDeliveries: row.deliveries.filter((item) => item.status === "DELIVERED").length,
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
  deliveries: { select: { status: true } },
} as const;

export async function listDrivers() {
  const rows = await prisma.drivers.findMany({
    include: driverInclude,
    orderBy: { id: "asc" },
  });
  return rows.map(toDriver);
}

export async function myDriver(userId: bigint) {
  const row = await prisma.drivers.findUnique({
    where: { user_id: userId },
    include: driverInclude,
  });
  if (!row) throw new AppError(403, "Driver profile not found");

  const deliveries = await listDeliveries({
    page: 1,
    pageSize: 50,
    driverId: row.id,
  });

  return { driver: toDriver(row), deliveries: deliveries.items };
}

async function driverById(id: bigint) {
  const row = await prisma.drivers.findUnique({ where: { id }, include: driverInclude });
  if (!row) throw new AppError(404, "Driver not found");
  return row;
}

export async function createDriver(input: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  licenseNumber: string;
}) {
  const user = await createStaffAccount({ ...input, role: "DRIVER" });
  const row = await prisma.drivers.findUnique({ where: { user_id: user.id }, include: driverInclude });
  if (!row) throw new AppError(500, "Driver profile was not created");
  return toDriver(row);
}

export async function updateDriver(
  id: bigint,
  input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    status?: "AVAILABLE" | "OFFLINE";
    enabled?: boolean;
    password?: string;
  },
) {
  const driver = await driverById(id);
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

      let nextStatus = input.status;
      if (input.enabled === false) nextStatus = "OFFLINE";
      if (nextStatus) {
        await tx.drivers.update({
          where: { id },
          data: { license_number: input.licenseNumber?.trim(), status: nextStatus },
        });
      } else if (input.licenseNumber) {
        await tx.drivers.update({
          where: { id },
          data: { license_number: input.licenseNumber.trim() },
        });
      }

      if (input.enabled !== false && input.status === "AVAILABLE") {
        const active = await tx.deliveries.count({
          where: { driver_id: id, status: { in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"] } },
        });
        await tx.drivers.update({
          where: { id },
          data: { status: active > 0 ? "ON_DELIVERY" : "AVAILABLE" },
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Email, phone, or license is already in use");
    }
    throw error;
  }

  return toDriver(await driverById(id));
}

export async function deleteDriver(id: bigint) {
  const driver = await prisma.drivers.findUnique({
    where: { id },
    include: { deliveries: { select: { id: true }, take: 1 } },
  });
  if (!driver) throw new AppError(404, "Driver not found");
  if (driver.deliveries.length > 0) {
    throw new AppError(
      409,
      "This driver still has deliveries. Reassign or delete those deliveries, or disable the driver.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery_events.updateMany({ where: { actor_id: driver.user_id }, data: { actor_id: null } });
    await tx.tokens.deleteMany({ where: { user_id: driver.user_id } });
    await tx.vehicle.updateMany({ where: { driver_id: id }, data: { driver_id: null } });
    await tx.driver_locations.deleteMany({ where: { driver_id: id } });
    await tx.drivers.delete({ where: { id } });
    await tx.users.delete({ where: { id: driver.user_id } });
  });
}
