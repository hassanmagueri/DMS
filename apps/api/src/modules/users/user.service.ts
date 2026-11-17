import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { deleteDispatcher } from "../dispatchers/dispatcher.service";
import { deleteDriver } from "../drivers/driver.service";
import { syncDriverPresence } from "../drivers/presence";

export async function setUserAccess(id: bigint, actorId: bigint, enabled: boolean) {
  if (id === actorId && !enabled) {
    throw new AppError(400, "You cannot block your own account");
  }
  const existing = await prisma.users.findUnique({
    where: { id },
    include: { drivers: { select: { id: true } } },
  });
  if (!existing) throw new AppError(404, "User not found");
  if (!enabled && existing.role === "ADMIN") {
    const others = await prisma.users.count({
      where: { role: "ADMIN", enabled: true, id: { not: id } },
    });
    if (others === 0) throw new AppError(400, "You cannot block the last active administrator");
  }

  await prisma.$transaction(async (tx) => {
    await tx.users.update({
      where: { id },
      data: {
        enabled,
        status: enabled ? "ACTIVE" : "DISABLED",
        updated_at: new Date(),
      },
    });
    if (!enabled) {
      await tx.tokens.updateMany({ where: { user_id: id }, data: { revoked: true } });
      if (existing.drivers) {
        await tx.drivers.update({ where: { id: existing.drivers.id }, data: { status: "OFFLINE" } });
      }
    }
  });
  if (enabled && existing.drivers) await syncDriverPresence(id);
}

export async function deleteUser(id: bigint, actorId: bigint) {
  if (id === actorId) throw new AppError(400, "You cannot remove your own account");
  const existing = await prisma.users.findUnique({
    where: { id },
    include: { drivers: { select: { id: true } } },
  });
  if (!existing) throw new AppError(404, "User not found");

  if (existing.role === "ADMIN") {
    const others = await prisma.users.count({
      where: { role: "ADMIN", enabled: true, id: { not: id } },
    });
    if (existing.enabled && others === 0) {
      throw new AppError(400, "You cannot remove the last active administrator");
    }
  }

  if (existing.role === "DRIVER" && existing.drivers) {
    await deleteDriver(existing.drivers.id);
    return;
  }
  if (existing.role === "DISPATCHER") {
    await deleteDispatcher(id, actorId);
    return;
  }

  const deliveries = await prisma.deliveries.count({ where: { customer_id: id } });
  if (deliveries > 0) {
    throw new AppError(409, "This account still has deliveries. Block it instead of removing it.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery_events.updateMany({ where: { actor_id: id }, data: { actor_id: null } });
    await tx.refunds.updateMany({ where: { actor_id: id }, data: { actor_id: null } });
    await tx.tokens.deleteMany({ where: { user_id: id } });
    await tx.users_roles.deleteMany({ where: { user_id: id } });
    await tx.users.delete({ where: { id } });
  });
}
