import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

const AVATAR = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const ACTIVE = ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

const profileInclude = {
  drivers: { include: { vehicle: true } },
} satisfies Prisma.usersInclude;

type ProfileUser = Prisma.usersGetPayload<{ include: typeof profileInclude }>;

function deliveryWhere(actor: { userId: bigint; role: string }, user: ProfileUser): Prisma.deliveriesWhereInput {
  const own = actor.userId === user.id;
  if (!own && actor.role === "DRIVER") {
    return { customer_id: user.id, drivers: { user_id: actor.userId } };
  }
  if (!own && actor.role === "CUSTOMER") {
    return { customer_id: actor.userId, drivers: { user_id: user.id } };
  }
  if (user.role === "CUSTOMER") return { customer_id: user.id };
  if (user.role === "DRIVER") return { drivers: { user_id: user.id } };
  return { OR: [{ customer_id: user.id }, { drivers: { user_id: user.id } }] };
}

async function assertCanView(actor: { userId: bigint; role: string }, user: ProfileUser) {
  if (actor.userId === user.id || actor.role === "ADMIN") return;
  if (actor.role === "DISPATCHER") {
    if (user.role === "CUSTOMER" || user.role === "DRIVER") return;
    throw new AppError(403, "Dispatchers can open customer and driver profiles");
  }
  const shared = await prisma.deliveries.count({ where: deliveryWhere(actor, user) });
  if (actor.role === "DRIVER" && user.role === "CUSTOMER" && shared > 0) return;
  if (actor.role === "CUSTOMER" && user.role === "DRIVER" && shared > 0) return;
  throw new AppError(403, "You can only open a profile for someone on your delivery");
}

export async function setOwnAvatar(userId: bigint, avatar: string | null) {
  if (avatar !== null && (avatar.length > 350_000 || !AVATAR.test(avatar))) {
    throw new AppError(400, "Choose a JPEG, PNG, or WebP image");
  }
  const user = await prisma.users.update({
    where: { id: userId },
    data: { avatar, updated_at: new Date() },
  });
  return { avatar: user.avatar };
}

export async function getProfile(actor: { userId: bigint; role: string }, targetId: bigint) {
  const user = await prisma.users.findUnique({ where: { id: targetId }, include: profileInclude });
  if (!user) throw new AppError(404, "Profile not found");
  await assertCanView(actor, user);

  const where = deliveryWhere(actor, user);
  const [deliveries, totalDeliveries, activeDeliveries, completedDeliveries] = await Promise.all([
    prisma.deliveries.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 8,
      include: {
        addresses_deliveries_pickup_address_idToaddresses: { select: { city: true } },
        addresses_deliveries_dropoff_address_idToaddresses: { select: { city: true } },
      },
    }),
    prisma.deliveries.count({ where }),
    user.drivers
      ? prisma.deliveries.count({ where: { driver_id: user.drivers.id, status: { in: ACTIVE } } })
      : Promise.resolve(0),
    user.drivers
      ? prisma.deliveries.count({ where: { driver_id: user.drivers.id, status: "DELIVERED" } })
      : Promise.resolve(0),
  ]);

  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    phone: user.phone,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    status: user.status,
    enabled: user.enabled,
    avatar: user.avatar,
    driver: user.drivers
      ? {
          id: Number(user.drivers.id),
          licenseNumber: user.drivers.license_number,
          status: user.drivers.status,
          activeDeliveries,
          completedDeliveries,
          vehicle: user.drivers.vehicle
            ? {
                brand: user.drivers.vehicle.brand,
                model: user.drivers.vehicle.model,
                plateNumber: user.drivers.vehicle.plate_number,
                type: user.drivers.vehicle.type,
              }
            : null,
        }
      : null,
    deliveryCount: totalDeliveries,
    deliveries: deliveries.map((delivery) => ({
      id: Number(delivery.id),
      status: delivery.status,
      createdAt: delivery.created_at,
      pickupCity: delivery.addresses_deliveries_pickup_address_idToaddresses.city,
      dropoffCity: delivery.addresses_deliveries_dropoff_address_idToaddresses.city,
    })),
  };
}
