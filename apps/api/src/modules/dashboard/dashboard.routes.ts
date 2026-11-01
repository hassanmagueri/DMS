import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { OPERATOR_ROLES, requireAuth, requireRoles } from "../../middleware/auth";
import { DELIVERY_STATUSES } from "../deliveries/delivery.schema";
import { toDelivery } from "../deliveries/delivery.service";

const router = Router();

router.use(requireAuth, requireRoles(...OPERATOR_ROLES));

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const [deliveryGroups, driverGroups, dispatcherCount, customerCount, recent, activities] = await Promise.all([
      prisma.deliveries.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.drivers.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.users.count({ where: { role: "DISPATCHER" } }),
      prisma.users.count({ where: { role: "CUSTOMER" } }),
      prisma.deliveries.findMany({
        take: 5,
        orderBy: { created_at: "desc" },
        include: {
          users: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
          drivers: {
            include: {
              users: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
              driver_locations: true,
            },
          },
          addresses_deliveries_pickup_address_idToaddresses: true,
          addresses_deliveries_dropoff_address_idToaddresses: true,
          delivery_events: {
            orderBy: { created_at: "asc" },
            include: { users: { select: { first_name: true, last_name: true } } },
          },
        },
      }),
      prisma.delivery_events.findMany({
        take: 8,
        orderBy: { created_at: "desc" },
        include: { users: { select: { first_name: true, last_name: true } } },
      }),
    ]);

    const countOf = (status: string) =>
      deliveryGroups.find((group) => group.status === status)?._count._all ?? 0;

    const driverCount = (status: string) =>
      driverGroups.find((group) => group.status === status)?._count._all ?? 0;

    const pickedUp = countOf("PICKED_UP");
    const inTransit = countOf("IN_TRANSIT");
    const accepted = countOf("ACCEPTED");

    res.json({
      totals: {
        deliveries: deliveryGroups.reduce((sum, group) => sum + group._count._all, 0),
        pending: countOf("PENDING"),
        assigned: countOf("ASSIGNED"),
        pickedUp,
        inTransit,
        inProgress: accepted + pickedUp + inTransit,
        accepted,
        delivered: countOf("DELIVERED"),
        failed: countOf("FAILED"),
        cancelled: countOf("CANCELLED"),
        drivers: driverGroups.reduce((sum, group) => sum + group._count._all, 0),
        availableDrivers: driverCount("AVAILABLE"),
        dispatchers: dispatcherCount,
        customers: customerCount,
      },
      byStatus: DELIVERY_STATUSES.map((status) => ({ status, count: countOf(status) })),
      recent: recent.map((row) => toDelivery(row, "ADMIN")),
      activities: activities.map((event) => ({
        id: Number(event.id),
        deliveryId: Number(event.delivery_id),
        fromStatus: event.from_status,
        toStatus: event.to_status,
        note: event.note,
        createdAt: event.created_at,
        actor: event.users ? `${event.users.first_name} ${event.users.last_name}` : null,
      })),
    });
  }),
);

export default router;
