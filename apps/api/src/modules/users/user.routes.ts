import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { nextId, prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();
const ROLES = ["ADMIN", "DISPATCHER", "DRIVER", "CUSTOMER"] as const;

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  username: z.string().trim().min(3).max(255).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().email().max(100),
  phone: z.string().trim().min(6).max(20),
  password: z.string().min(8).max(72),
  role: z.enum(ROLES),
  licenseNumber: z.string().trim().min(3).max(255).optional(),
});

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(255).optional(),
  lastName: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  enabled: z.boolean().optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

function toUser(user: {
  id: bigint;
  username: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  enabled: boolean;
}) {
  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    phone: user.phone,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    status: user.status,
    enabled: user.enabled,
  };
}

router.use(requireAuth, requireRoles("ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const users = await prisma.users.findMany({
      where: {
        ...(role && role !== "ALL" ? { role } : {}),
        ...(q
          ? {
              OR: [
                { first_name: { contains: q, mode: "insensitive" } },
                { last_name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { id: "asc" },
    });
    res.json(users.map(toUser));
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    if (body.role === "DRIVER" && !body.licenseNumber) {
      throw new AppError(400, "A driver needs a license number");
    }
    const roleRow = await prisma.roles.findUnique({ where: { name: `ROLE_${body.role}` } });
    const password = await bcrypt.hash(body.password, 10);
    try {
      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.users.create({
          data: {
            id: await nextId("users_id_seq"),
            first_name: body.firstName,
            last_name: body.lastName,
            username: body.username,
            email: body.email,
            phone: body.phone,
            password,
            role: body.role,
            status: "ACTIVE",
            enabled: true,
            ...(roleRow ? { users_roles: { create: { role_id: roleRow.id } } } : {}),
          },
        });
        if (body.role === "DRIVER" && body.licenseNumber) {
          await tx.drivers.create({
            data: {
              id: await nextId("drivers_id_seq"),
              user_id: created.id,
              license_number: body.licenseNumber,
              status: "AVAILABLE",
            },
          });
        }
        return created;
      });
      res.status(201).json(toUser(user));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "Email, phone, username, or license is already in use");
      }
      throw error;
    }
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!raw || !/^\d+$/.test(raw)) throw new AppError(400, "Invalid id");
    const id = BigInt(raw);
    const body = updateSchema.parse(req.body);
    const existing = await prisma.users.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "User not found");
    if (existing.id === req.auth!.userId && body.enabled === false) {
      throw new AppError(400, "You cannot disable your own account");
    }
    const user = await prisma.users.update({
      where: { id },
      data: {
        first_name: body.firstName,
        last_name: body.lastName,
        phone: body.phone,
        enabled: body.enabled,
        status: body.status ?? (body.enabled === false ? "DISABLED" : body.enabled === true ? "ACTIVE" : undefined),
        updated_at: new Date(),
      },
    });
    res.json(toUser(user));
  }),
);

export default router;
