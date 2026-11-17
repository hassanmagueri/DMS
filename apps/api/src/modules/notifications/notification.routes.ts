import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { listActionNotifications } from "./notification.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const all = req.query.all === "1" && (req.auth!.role === "ADMIN" || req.auth!.role === "DISPATCHER");
    res.json(await listActionNotifications(req.auth!, all));
  }),
);

export default router;
