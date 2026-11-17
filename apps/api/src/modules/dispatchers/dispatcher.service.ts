import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { createStaffAccount } from "../users/account.service";

function toDispatcher(user: {
  id: bigint;
  username: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  status: string;
  enabled: boolean;
}) {
  return {
    id: Number(user.id),
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    enabled: user.enabled,
  };
}

export async function listDispatchers() {
  const rows = await prisma.users.findMany({
    where: { role: "DISPATCHER" },
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
  });
  return rows.map(toDispatcher);
}

export async function createDispatcher(input: {
  firstName: string;
  lastName: string;
  username: string;
  email?: string | null;
  phone: string;
  password: string;
}) {
  const user = await createStaffAccount({ ...input, role: "DISPATCHER" });
  return toDispatcher(user);
}

export async function updateDispatcher(
  id: bigint,
  actorId: bigint,
  input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    enabled?: boolean;
    password?: string;
  },
) {
  const existing = await prisma.users.findUnique({ where: { id } });
  if (!existing || existing.role !== "DISPATCHER") throw new AppError(404, "Dispatcher not found");
  if (existing.id === actorId && input.enabled === false) {
    throw new AppError(400, "You cannot disable your own account");
  }

  const password = input.password ? await bcrypt.hash(input.password, 10) : undefined;
  try {
    const user = await prisma.users.update({
      where: { id },
      data: {
        first_name: input.firstName?.trim(),
        last_name: input.lastName?.trim(),
        email: input.email?.trim(),
        phone: input.phone?.trim(),
        password,
        enabled: input.enabled,
        status: input.enabled === false ? "DISABLED" : input.enabled === true ? "ACTIVE" : undefined,
        updated_at: new Date(),
      },
    });
    if (input.enabled === false) {
      await prisma.tokens.updateMany({ where: { user_id: id }, data: { revoked: true } });
    }
    return toDispatcher(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Email or phone is already in use");
    }
    throw error;
  }
}

export async function deleteDispatcher(id: bigint, actorId: bigint) {
  if (id === actorId) throw new AppError(400, "You cannot delete your own account");
  const existing = await prisma.users.findUnique({ where: { id } });
  if (!existing || existing.role !== "DISPATCHER") throw new AppError(404, "Dispatcher not found");

  await prisma.$transaction(async (tx) => {
    await tx.delivery_events.updateMany({ where: { actor_id: id }, data: { actor_id: null } });
    await tx.refunds.updateMany({ where: { actor_id: id }, data: { actor_id: null } });
    await tx.tokens.deleteMany({ where: { user_id: id } });
    await tx.users_roles.deleteMany({ where: { user_id: id } });
    await tx.users.delete({ where: { id } });
  });
}
