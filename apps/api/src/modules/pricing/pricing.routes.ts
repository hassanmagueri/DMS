import { Router } from "express";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { quoteDelivery } from "./pricing.service";

const router = Router();

router.use(requireAuth);

router.get(
  "/quote",
  asyncHandler(async (req, res) => {
    const weight = Number(req.query.weight);
    if (!Number.isFinite(weight)) throw new AppError(400, "Weight is required");
    res.json(quoteDelivery(weight));
  }),
);

export default router;
