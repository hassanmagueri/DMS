import { Router } from "express";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { createSavedAddress, deleteSavedAddress, listSavedAddresses, savedAddressSchema } from "./address.service";

const router = Router();

router.use(requireAuth);

function idParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) throw new AppError(400, "Invalid id");
  return BigInt(raw);
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const role = req.auth!.role;
    if (role === "CUSTOMER") {
      res.json(await listSavedAddresses(req.auth!.userId));
      return;
    }
    if (role !== "ADMIN" && role !== "DISPATCHER") {
      throw new AppError(403, "You do not have access to this action");
    }
    const customerId = req.query.customerId;
    if (typeof customerId !== "string" || !/^\d+$/.test(customerId)) {
      throw new AppError(400, "Choose a customer");
    }
    res.json(await listSavedAddresses(BigInt(customerId)));
  }),
);

router.post(
  "/",
  requireRoles("CUSTOMER"),
  asyncHandler(async (req, res) => {
    const body = savedAddressSchema.parse(req.body);
    res.status(201).json(await createSavedAddress(req.auth!.userId, body));
  }),
);

router.delete(
  "/:id",
  requireRoles("CUSTOMER", "ADMIN"),
  asyncHandler(async (req, res) => {
    await deleteSavedAddress(idParam(req.params.id), req.auth!);
    res.status(204).end();
  }),
);

export default router;
