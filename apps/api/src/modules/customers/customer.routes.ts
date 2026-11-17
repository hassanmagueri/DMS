import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { OPERATOR_ROLES, requireAuth, requireRoles } from "../../middleware/auth";
import { deleteUser, setUserAccess } from "../users/user.service";

const router = Router();

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(255).optional(),
  lastName: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(100).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  enabled: z.boolean().optional(),
});

function idParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) throw new AppError(400, "Invalid id");
  return BigInt(raw);
}

router.use(requireAuth, requireRoles(...OPERATOR_ROLES));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const customers = await prisma.users.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        enabled: true,
      },
      orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
    });

    res.json(
      customers.map((customer) => ({
        id: Number(customer.id),
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        enabled: customer.enabled,
      })),
    );
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const body = updateSchema.parse(req.body);
    const existing = await prisma.users.findUnique({ where: { id } });
    if (!existing || existing.role !== "CUSTOMER") throw new AppError(404, "Customer not found");

    const editing = body.firstName !== undefined || body.lastName !== undefined || body.email !== undefined || body.phone !== undefined;
    if (req.auth!.role !== "ADMIN" && (editing || body.enabled === undefined)) {
      throw new AppError(403, "Dispatchers can block a customer, not edit or remove the account");
    }

    if (body.enabled !== undefined) {
      await setUserAccess(id, req.auth!.userId, body.enabled);
    }

    try {
      const user = await prisma.users.update({
        where: { id },
        data: {
          first_name: body.firstName,
          last_name: body.lastName,
          email: body.email,
          phone: body.phone,
          updated_at: new Date(),
        },
      });
      res.json({
        id: Number(user.id),
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        enabled: user.enabled,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "Email or phone is already in use");
      }
      throw error;
    }
  }),
);

router.delete(
  "/:id",
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id);
    const existing = await prisma.users.findUnique({ where: { id } });
    if (!existing || existing.role !== "CUSTOMER") throw new AppError(404, "Customer not found");
    await deleteUser(id, req.auth!.userId);
    res.status(204).end();
  }),
);

export default router;
