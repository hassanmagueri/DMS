import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/asyncHandler";
import { OPERATOR_ROLES, requireAuth, requireRoles } from "../../middleware/auth";

const router = Router();

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

export default router;
