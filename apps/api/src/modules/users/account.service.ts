import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { nextId, prisma } from "../../lib/prisma";

export async function createStaffAccount(input: {
  firstName: string;
  lastName: string;
  username: string;
  email?: string | null;
  phone: string;
  password: string;
  role: "DRIVER" | "DISPATCHER";
  licenseNumber?: string;
}) {
  if (input.role === "DRIVER" && !input.licenseNumber) {
    throw new AppError(400, "A driver needs a license number");
  }

  const roleRow = await prisma.roles.findUnique({ where: { name: `ROLE_${input.role}` } });
  const password = await bcrypt.hash(input.password, 10);

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.users.create({
        data: {
          id: await nextId("users_id_seq"),
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          username: input.username.trim(),
          email: null,
          phone: input.phone.trim(),
          password,
          role: input.role,
          status: "ACTIVE",
          enabled: true,
          email_verified: false,
          must_change_password: true,
          ...(roleRow ? { users_roles: { create: { role_id: roleRow.id } } } : {}),
        },
      });

      if (input.role === "DRIVER" && input.licenseNumber) {
        await tx.drivers.create({
          data: {
            id: await nextId("drivers_id_seq"),
            user_id: created.id,
            license_number: input.licenseNumber.trim(),
            status: "OFFLINE",
          },
        });
      }

      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Email, phone, username, or license is already in use");
    }
    throw error;
  }
}
