import { Router } from "express";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { OPERATOR_ROLES, requireAuth, requireRoles } from "../../middleware/auth";
import { assignDriverSchema, createDeliverySchema, ratingSchema, updateDeliverySchema, updateStatusSchema } from "./delivery.schema";
import {
  assignDriver,
  createDelivery,
  deleteDelivery,
  driverForUser,
  getDelivery,
  listDeliveries,
  rateDelivery,
  respondToAssignment,
  updateDelivery,
  updateStatus,
} from "./delivery.service";

const router = Router();

router.use(requireAuth);

function idParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) throw new AppError(400, "Invalid id");
  return BigInt(raw);
}

function pageQuery(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

router.get(
  "/mine",
  requireRoles("CUSTOMER"),
  asyncHandler(async (req, res) => {
    const pageSize = Math.min(pageQuery(req.query.pageSize, 8), 50);
    res.json(
      await listDeliveries({
        customerId: req.auth!.userId,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        page: pageQuery(req.query.page, 1),
        pageSize,
      }),
    );
  }),
);

router.get(
  "/",
  requireRoles(...OPERATOR_ROLES),
  asyncHandler(async (req, res) => {
    const pageSize = Math.min(pageQuery(req.query.pageSize, 8), 50);
    res.json(
      await listDeliveries({
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        page: pageQuery(req.query.page, 1),
        pageSize,
      }),
    );
  }),
);

router.post(
  "/",
  requireRoles(...OPERATOR_ROLES, "CUSTOMER"),
  asyncHandler(async (req, res) => {
    const body = createDeliverySchema.parse(req.body);
    const customerId = req.auth!.role === "CUSTOMER" ? Number(req.auth!.userId) : body.customerId;
    if (!customerId) throw new AppError(400, "Choose a customer");
    res.status(201).json(await createDelivery({ ...body, customerId }));
  }),
);

router.patch(
  "/:id",
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = updateDeliverySchema.parse(req.body);
    res.json(await updateDelivery(idParam(req.params.id), req.auth!.userId, body));
  }),
);

router.delete(
  "/:id",
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    await deleteDelivery(idParam(req.params.id));
    res.status(204).end();
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    if (req.auth!.role === "DRIVER") {
      const driver = await driverForUser(req.auth!.userId);
      res.json(await getDelivery(id, { driverId: driver.id, role: "DRIVER" }));
      return;
    }
    if (req.auth!.role === "CUSTOMER") {
      res.json(await getDelivery(id, { customerId: req.auth!.userId, role: "CUSTOMER" }));
      return;
    }
    if (req.auth!.role !== "ADMIN" && req.auth!.role !== "DISPATCHER") {
      throw new AppError(403, "You do not have access to this action");
    }
    res.json(await getDelivery(id, { role: req.auth!.role }));
  }),
);

router.post(
  "/:id/assign",
  requireRoles(...OPERATOR_ROLES),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const body = assignDriverSchema.parse(req.body);
    res.json(await assignDriver(id, body.driverId, req.auth!.userId));
  }),
);

router.post(
  "/:id/accept",
  requireRoles("DRIVER"),
  asyncHandler(async (req, res) => {
    res.json(await respondToAssignment(idParam(req.params.id), req.auth!.userId, true));
  }),
);

router.post(
  "/:id/reject",
  requireRoles("DRIVER"),
  asyncHandler(async (req, res) => {
    res.json(await respondToAssignment(idParam(req.params.id), req.auth!.userId, false));
  }),
);

router.post(
  "/:id/rating",
  requireRoles("CUSTOMER"),
  asyncHandler(async (req, res) => {
    const body = ratingSchema.parse(req.body);
    res.status(201).json(await rateDelivery(idParam(req.params.id), req.auth!.userId, body.score));
  }),
);

router.post(
  "/:id/status",
  requireRoles("ADMIN", "DISPATCHER", "DRIVER", "CUSTOMER"),
  asyncHandler(async (req, res) => {
    const body = updateStatusSchema.parse(req.body);
    res.json(
      await updateStatus(idParam(req.params.id), body.status, req.auth!, body.confirmationCode, body.failureReason),
    );
  }),
);

export default router;
