import { prisma } from "../../lib/prisma";

export type ActionNotification = {
  id: string;
  deliveryId: number;
  title: string;
  body: string;
  href: string;
  createdAt: Date;
  role?: "CUSTOMER" | "DRIVER" | "DISPATCHER";
  person?: string;
};

const DRIVER_ACTIONS: Record<string, { title: string; body: (id: number) => string }> = {
  ASSIGNED: {
    title: "Respond to an assignment",
    body: (id) => `Accept or reject delivery #${id}.`,
  },
  ACCEPTED: {
    title: "Pick up a delivery",
    body: (id) => `Mark delivery #${id} as picked up.`,
  },
  PICKED_UP: {
    title: "Start a trip",
    body: (id) => `Mark delivery #${id} as in transit.`,
  },
  IN_TRANSIT: {
    title: "Confirm a delivery",
    body: (id) => `Mark delivery #${id} as delivered.`,
  },
};

function item(
  deliveryId: bigint,
  status: string,
  title: string,
  body: string,
  href: string,
  createdAt: Date,
  role?: ActionNotification["role"],
  person?: string,
): ActionNotification {
  return {
    id: role ? `${deliveryId}-${role}-${status}` : `${deliveryId}-${status}`,
    deliveryId: Number(deliveryId),
    title,
    body,
    href,
    createdAt,
    role,
    person,
  };
}

const deskInclude = {
  users: { select: { first_name: true, last_name: true } },
  drivers: { include: { users: { select: { first_name: true, last_name: true } } } },
  driver_ratings: { select: { id: true } },
  delivery_events: { orderBy: { created_at: "desc" as const }, take: 1 },
};

const OPEN_STATUSES = ["PENDING", "REJECTED", "FAILED", "ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"];

async function listDeskActions() {
  const openWhere = { status: { in: OPEN_STATUSES } };
  const [openCount, rows, unrated] = await Promise.all([
    prisma.deliveries.count({ where: openWhere }),
    prisma.deliveries.findMany({
      where: openWhere,
      include: deskInclude,
      orderBy: { created_at: "desc" },
      take: 120,
    }),
    prisma.deliveries.findMany({
      where: {
        status: "DELIVERED",
        proof_confirmed_at: { not: null },
        driver_id: { not: null },
        driver_ratings: { is: null },
      },
      include: deskInclude,
      orderBy: { created_at: "desc" },
      take: 40,
    }),
  ]);

  const actions: ActionNotification[] = [];
  for (const row of [...rows, ...unrated]) {
    const when = row.delivery_events[0]?.created_at ?? row.created_at;
    const customer = `${row.users.first_name} ${row.users.last_name}`;
    const driver = row.drivers ? `${row.drivers.users.first_name} ${row.drivers.users.last_name}` : null;
    const href = `/deliveries/${row.id}`;
    const id = row.id;

    if (row.status === "PENDING") {
      actions.push(item(id, row.status, "Assign a driver", `${customer} requested delivery #${id}.`, href, when, "DISPATCHER", "Dispatchers"));
    } else if (row.status === "REJECTED") {
      actions.push(item(id, row.status, "Reassign a driver", `Delivery #${id} for ${customer} was rejected.`, href, when, "DISPATCHER", "Dispatchers"));
    } else if (row.status === "FAILED") {
      actions.push(item(id, row.status, "Send a delivery again", `Delivery #${id} for ${customer} failed and can go back to the queue.`, href, when, "DISPATCHER", "Dispatchers"));
    }

    if (driver && ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"].includes(row.status)) {
      const driverCopy: Record<string, [string, string]> = {
        ASSIGNED: ["Respond to an assignment", `${driver} needs to accept or reject delivery #${id}.`],
        ACCEPTED: ["Pick up a delivery", `${driver} needs to pick up delivery #${id}.`],
        PICKED_UP: ["Start a trip", `${driver} needs to mark delivery #${id} in transit.`],
        IN_TRANSIT: ["Confirm a delivery", `${driver} needs the customer code for delivery #${id}.`],
      };
      const [title, body] = driverCopy[row.status];
      actions.push(item(id, row.status, title, body, href, when, "DRIVER", driver));
      const customerCopy: Record<string, [string, string]> = {
        ASSIGNED: ["Driver assigned", `${customer} can follow delivery #${id}.`],
        ACCEPTED: ["Driver accepted", `${customer}'s driver accepted delivery #${id}.`],
        PICKED_UP: ["Parcel picked up", `${customer} can track delivery #${id}.`],
        IN_TRANSIT: ["Delivery is moving", `${customer} can track delivery #${id}.`],
      };
      const [customerTitle, customerBody] = customerCopy[row.status];
      actions.push(item(id, row.status, customerTitle, customerBody, href, when, "CUSTOMER", customer));
    }

    if (row.status === "DELIVERED" && row.proof_confirmed_at && row.drivers && !row.driver_ratings) {
      actions.push(
        item(id, "RATE", "Rate the driver", `${customer} can rate the driver for delivery #${id}.`, href, when, "CUSTOMER", customer),
      );
    }
  }
  return { items: actions, limited: openCount > rows.length };
}

export async function listActionNotifications(actor: { userId: bigint; role: string }, all = false) {
  if (actor.role === "ADMIN" && all) return listDeskActions();
  if (actor.role === "ADMIN" || actor.role === "DISPATCHER") {
    const where = { status: { in: ["PENDING", "REJECTED"] } };
    const take = all ? 200 : 20;
    const [total, rows] = await prisma.$transaction([
      prisma.deliveries.count({ where }),
      prisma.deliveries.findMany({
        where,
        include: {
          users: { select: { first_name: true, last_name: true } },
          delivery_events: { orderBy: { created_at: "desc" as const }, take: 1 },
        },
        orderBy: { created_at: "desc" },
        take,
      }),
    ]);

    return {
      items: rows.map((row) => {
        const customer = `${row.users.first_name} ${row.users.last_name}`;
        const when = row.delivery_events[0]?.created_at ?? row.created_at;
        if (row.status === "REJECTED") {
          return item(
            row.id,
            row.status,
            "Reassign a driver",
            `Delivery #${row.id} for ${customer} was rejected.`,
            `/deliveries/${row.id}`,
            when,
          );
        }
        return item(
          row.id,
          row.status,
          "New delivery request",
          `${customer} added delivery #${row.id}. Assign a driver.`,
          `/deliveries/${row.id}`,
          when,
        );
      }),
      limited: total > rows.length,
    };
  }

  if (actor.role === "DRIVER") {
    const driver = await prisma.drivers.findUnique({ where: { user_id: actor.userId } });
    if (!driver) return { items: [], limited: false };
    const rows = await prisma.deliveries.findMany({
      where: {
        driver_id: driver.id,
        status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT"] },
      },
      include: { delivery_events: { orderBy: { created_at: "desc" }, take: 1 } },
      orderBy: { created_at: "desc" },
      take: 20,
    });
    return {
      items: rows.flatMap((row) => {
      const action = DRIVER_ACTIONS[row.status];
      if (!action) return [];
      return [
        item(
          row.id,
          row.status,
          action.title,
          action.body(Number(row.id)),
          "/driver",
          row.delivery_events[0]?.created_at ?? row.created_at,
        ),
      ];
    }),
      limited: false,
    };
  }

  if (actor.role === "CUSTOMER") {
    const rows = await prisma.deliveries.findMany({
      where: {
        customer_id: actor.userId,
        status: { in: ["ASSIGNED", "ACCEPTED", "PICKED_UP", "IN_TRANSIT", "REJECTED"] },
      },
      include: { delivery_events: { orderBy: { created_at: "desc" }, take: 1 } },
      orderBy: { created_at: "desc" },
      take: 20,
    });
    return {
      items: rows.map((row) => {
        const when = row.delivery_events[0]?.created_at ?? row.created_at;
        const href = `/customer/${row.id}`;
        if (row.status === "REJECTED") {
          return item(row.id, row.status, "Assignment rejected", `Delivery #${row.id} is waiting for another driver.`, href, when);
        }
        if (row.status === "ASSIGNED") {
          return item(row.id, row.status, "Driver assigned", `Open delivery #${row.id} to follow your driver.`, href, when);
        }
        if (row.status === "IN_TRANSIT" || row.status === "PICKED_UP") {
          return item(row.id, row.status, "Delivery is moving", `Track delivery #${row.id}.`, href, when);
        }
        return item(row.id, row.status, "Driver accepted", `Your driver accepted delivery #${row.id}.`, href, when);
      }),
      limited: false,
    };
  }

  return { items: [], limited: false };
}
