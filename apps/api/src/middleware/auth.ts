import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { syncDriverPresence } from "../modules/drivers/presence";
import { asyncHandler } from "./asyncHandler";

export const OPERATOR_ROLES = ["ADMIN", "DISPATCHER"] as const;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new AppError(500, "JWT secret is not configured");
  }
  return value;
}

export function signToken(userId: bigint, role: string) {
  return jwt.sign({ sub: userId.toString(), role }, secret(), { expiresIn: "12h" });
}

export function signSetupToken(userId: bigint) {
  return jwt.sign({ sub: userId.toString(), purpose: "setup" }, secret(), { expiresIn: "10m" });
}

export function readSetupToken(token: string) {
  try {
    const decoded = jwt.verify(token, secret());
    if (typeof decoded === "string" || decoded.purpose !== "setup" || !decoded.sub) {
      throw new Error("Invalid token");
    }
    return BigInt(decoded.sub);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, "That setup step expired. Sign in again.");
  }
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    throw new AppError(401, "Sign in required");
  }

  let userId: bigint;
  try {
    const decoded = jwt.verify(token, secret());
    if (typeof decoded === "string" || !decoded.sub) {
      throw new Error("Invalid token");
    }
    userId = BigInt(decoded.sub);
  } catch (error) {
    if (error instanceof AppError) throw error;
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded !== "string" && decoded.sub) {
      await syncDriverPresence(BigInt(decoded.sub));
    }
    throw new AppError(401, "Sign in required");
  }

  const stored = await prisma.tokens.findUnique({ where: { token } });
  if (!stored || stored.revoked) {
    await syncDriverPresence(stored?.user_id ?? userId);
    throw new AppError(401, "Session expired");
  }

  const user = await prisma.users.findUnique({ where: { id: userId } });
  if (!user || !user.enabled) {
    throw new AppError(403, "This account is blocked");
  }

  req.auth = { userId: user.id, role: user.role, token };
  next();
});

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      next(new AppError(403, "You do not have access to this action"));
      return;
    }
    next();
  };
}
