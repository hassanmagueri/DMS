import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  checkout,
  collect,
  mine,
  refund,
  show,
  showForDelivery,
  webhook,
} from "./payment.controller";

const router = Router();

router.post("/webhooks/:provider", asyncHandler(webhook));

router.use(requireAuth);

router.post("/checkout", requireRoles("CUSTOMER"), asyncHandler(checkout));
router.get("/mine", requireRoles("CUSTOMER"), asyncHandler(mine));
router.get("/delivery/:deliveryId", asyncHandler(showForDelivery));
router.get("/:id", asyncHandler(show));
router.post("/:id/refund", requireRoles("ADMIN"), asyncHandler(refund));
router.post("/:id/collect-cash", requireRoles("ADMIN", "DISPATCHER", "DRIVER"), asyncHandler(collect));

export default router;
