import { z } from "zod";
import { AppError } from "../../lib/errors";
import { nextId, prisma } from "../../lib/prisma";

export const savedAddressSchema = z.object({
  label: z.string().trim().min(1, "Give the address a name").max(80),
  street: z.string().trim().min(1).max(255),
  city: z.string().trim().min(1).max(255),
  state: z.string().trim().max(255).optional(),
  postalCode: z.string().trim().max(255).optional(),
  country: z.string().trim().min(1).max(255),
});

export type SavedAddressInput = z.infer<typeof savedAddressSchema>;

function toSavedAddress(row: {
  id: bigint;
  label: string;
  street: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
}) {
  return {
    id: Number(row.id),
    label: row.label,
    street: row.street,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
  };
}

export async function listSavedAddresses(userId: bigint) {
  const rows = await prisma.saved_addresses.findMany({
    where: { user_id: userId },
    orderBy: { label: "asc" },
  });
  return rows.map(toSavedAddress);
}

export async function createSavedAddress(userId: bigint, input: SavedAddressInput) {
  const row = await prisma.saved_addresses.create({
    data: {
      id: await nextId("saved_addresses_id_seq"),
      user_id: userId,
      label: input.label,
      street: input.street,
      city: input.city,
      state: input.state?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      country: input.country,
    },
  });
  return toSavedAddress(row);
}

export async function deleteSavedAddress(id: bigint, actor: { userId: bigint; role: string }) {
  const row = await prisma.saved_addresses.findUnique({ where: { id } });
  if (!row) throw new AppError(404, "Address not found");
  if (actor.role !== "ADMIN" && row.user_id !== actor.userId) {
    throw new AppError(403, "You can only remove your own addresses");
  }
  await prisma.saved_addresses.delete({ where: { id } });
}
