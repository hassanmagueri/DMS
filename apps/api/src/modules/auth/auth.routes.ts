import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import {
  beginEmailLink,
  completePasswordSetup,
  currentUser,
  login,
  logout,
  register,
  verifyLoginSetup,
  verifyRegister,
} from "./auth.service";

const router = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username").max(255),
  password: z.string().min(1, "Password is required"),
});

const linkSchema = loginSchema.extend({
  address: z.string().trim().email("Enter a valid email").max(100),
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

const verifySchema = z.object({
  username: z.string().trim().min(1, "Enter your username").max(255),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

const verifyLoginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username").max(255),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

const passwordSetupSchema = z.object({
  setupToken: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    res.json(await login(body.username, body.password));
  }),
);

router.post(
  "/login/link",
  asyncHandler(async (req, res) => {
    const body = linkSchema.parse(req.body);
    res.json(await beginEmailLink(body.username, body.password, body.address));
  }),
);

router.post(
  "/login/verify",
  asyncHandler(async (req, res) => {
    const body = verifyLoginSchema.parse(req.body);
    res.json(await verifyLoginSetup(body.username, body.code));
  }),
);

router.post(
  "/login/password",
  asyncHandler(async (req, res) => {
    const body = passwordSetupSchema.parse(req.body);
    res.json(await completePasswordSetup(body.setupToken, body.password));
  }),
);

router.post(
  "/register/verify",
  asyncHandler(async (req, res) => {
    const body = verifySchema.parse(req.body);
    res.json(await verifyRegister(body.username, body.code));
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
