import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { OPERATOR_ROLES, requireAuth, requireRoles } from "../../middleware/auth";
import { locationSchema } from "../deliveries/delivery.schema";
import { shareLocation } from "../deliveries/delivery.service";
import { createDriver, deleteDriver, listDrivers, myDriver, updateDriver } from "./driver.service";

const router = Router();

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  username: z.string().trim().min(3).max(255).regex(/^[a-zA-Z0-9_]+$/),
  email: z.union([z.string().trim().email().max(100), z.literal("")]).optional(),
  phone: z.string().trim().min(6).max(20),
  password: z.string().min(8).max(72),
  licenseNumber: z.string().trim().min(3).max(255),
});

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(255).optional(),
  lastName: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(100).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  licenseNumber: z.string().trim().min(3).max(255).optional(),
  enabled: z.boolean().optional(),
  password: z.string().min(8).max(72).optional(),
});

function idParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) throw new AppError(400, "Invalid id");
  return BigInt(raw);
}

router.use(requireAuth);

function pageQuery(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

router.get(
  "/",
  requireRoles(...OPERATOR_ROLES),
  asyncHandler(async (req, res) => {
    const pageSize = Math.min(pageQuery(req.query.pageSize, 20), 50);
    res.json(
      await listDrivers({
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        assignable: req.query.assignable === "1",
        page: pageQuery(req.query.page, 1),
        pageSize,
      }),
    );
  }),
);

router.post(
  "/",
  requireRoles(...OPERATOR_ROLES),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    res.status(201).json(await createDriver(body));
  }),
);

router.patch(
  "/:id",
  requireRoles(...OPERATOR_ROLES),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    res.json(await updateDriver(idParam(req.params.id), body));
  }),
);

router.delete(
  "/:id",
  requireRoles(...OPERATOR_ROLES),
  asyncHandler(async (req, res) => {
    await deleteDriver(idParam(req.params.id));
    res.status(204).end();
  }),
);

router.get(
  "/me",
  requireRoles("DRIVER"),
  asyncHandler(async (req, res) => {
    res.json(await myDriver(req.auth!.userId));
  }),
);

router.post(
  "/me/location",
  requireRoles("DRIVER"),
  asyncHandler(async (req, res) => {
    const body = locationSchema.parse(req.body);
    res.json(await shareLocation(req.auth!.userId, body.latitude, body.longitude));
  }),
);

export default router;
