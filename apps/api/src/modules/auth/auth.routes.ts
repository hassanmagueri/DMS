import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { currentUser, login, logout, register } from "./auth.service";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(255),
  lastName: z.string().trim().min(1, "Last name is required").max(255),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(255)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can use letters, numbers, and underscores"),
  email: z.string().trim().email("Enter a valid email").max(100),
  phone: z.string().trim().min(6, "Enter a phone number").max(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    res.status(201).json(await register(body));
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    res.json(await login(body.email, body.password));
  }),
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await logout(req.auth!.token);
    res.status(204).send();
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await currentUser(req.auth!.userId) });
  }),
);

export default router;
