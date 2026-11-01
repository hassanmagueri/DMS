import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { createDispatcher, deleteDispatcher, listDispatchers, updateDispatcher } from "./dispatcher.service";

const router = Router();

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  username: z.string().trim().min(3).max(255).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().email().max(100),
  phone: z.string().trim().min(6).max(20),
  password: z.string().min(8).max(72),
});

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(255).optional(),
  lastName: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(100).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  enabled: z.boolean().optional(),
  password: z.string().min(8).max(72).optional(),
});

function idParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) throw new AppError(400, "Invalid id");
  return BigInt(raw);
}

router.use(requireAuth);

router.get(
  "/",
  requireRoles("ADMIN", "DISPATCHER"),
  asyncHandler(async (_req, res) => {
    res.json(await listDispatchers());
  }),
);

router.post(
  "/",
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    res.status(201).json(await createDispatcher(body));
  }),
);

router.patch(
  "/:id",
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    res.json(await updateDispatcher(idParam(req.params.id), req.auth!.userId, body));
  }),
);

router.delete(
  "/:id",
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    await deleteDispatcher(idParam(req.params.id), req.auth!.userId);
    res.status(204).end();
  }),
);

export default router;
