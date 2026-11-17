import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { getProfile, setOwnAvatar } from "./profile.service";

const avatarSchema = z.object({
  avatar: z.string().max(350_000).nullable(),
});

const router = Router();

function idParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) throw new AppError(400, "Invalid id");
  return BigInt(raw);
}

router.use(requireAuth);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json(await getProfile(req.auth!, req.auth!.userId));
  }),
);

router.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const body = avatarSchema.parse(req.body);
    res.json(await setOwnAvatar(req.auth!.userId, body.avatar));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(await getProfile(req.auth!, idParam(req.params.id)));
  }),
);

export default router;
