import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { nextId, prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { OPERATOR_ROLES, requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();

function toVehicle(row: {
  id: bigint;
  brand: string;
  model: string;
  plate_number: string;
  type: string;
  driver_id: bigint | null;
  drivers: { users: { first_name: string; last_name: string } } | null;
}) {
  return {
    id: Number(row.id),
    brand: row.brand,
    model: row.model,
    plateNumber: row.plate_number,
    type: row.type,
    driverId: row.driver_id ? Number(row.driver_id) : null,
    driverName: row.drivers ? `${row.drivers.users.first_name} ${row.drivers.users.last_name}` : null,
  };
}

const include = { drivers: { include: { users: { select: { first_name: true, last_name: true } } } } } as const;

router.use(requireAuth, requireRoles(...OPERATOR_ROLES));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.vehicle.findMany({ include, orderBy: { id: "asc" } });
    res.json(rows.map(toVehicle));
  }),
);

router.post(
  "/",
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        brand: z.string().trim().min(1).max(255),
        model: z.string().trim().min(1).max(255),
        plateNumber: z.string().trim().min(1).max(255),
        type: z.enum(["MOTORCYCLE", "CAR", "VAN", "TRUCK"]),
        driverId: z.number().int().positive().optional(),
      })
      .parse(req.body);
    const row = await prisma.vehicle.create({
      data: {
        id: await nextId("vehicle_id_seq"),
        brand: body.brand,
        model: body.model,
        plate_number: body.plateNumber,
        type: body.type,
        driver_id: body.driverId ? BigInt(body.driverId) : null,
      },
      include,
    });
    res.status(201).json(toVehicle(row));
  }),
);

router.patch(
  "/:id",
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!raw || !/^\d+$/.test(raw)) throw new AppError(400, "Invalid id");
    const id = BigInt(raw);
    const body = z.object({ driverId: z.number().int().positive().nullable() }).parse(req.body);
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "Vehicle not found");
    if (body.driverId) {
      await prisma.vehicle.updateMany({ where: { driver_id: BigInt(body.driverId), NOT: { id } }, data: { driver_id: null } });
    }
    const row = await prisma.vehicle.update({
      where: { id },
      data: { driver_id: body.driverId ? BigInt(body.driverId) : null },
      include,
    });
    res.json(toVehicle(row));
  }),
);

export default router;
