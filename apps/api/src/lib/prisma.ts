import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const SEQUENCES = [
  "addresses_id_seq",
  "deliveries_id_seq",
  "tokens_id_seq",
  "users_id_seq",
  "drivers_id_seq",
  "vehicle_id_seq",
  "delivery_events_id_seq",
] as const;

export type SequenceName = (typeof SEQUENCES)[number];

export async function nextId(sequence: SequenceName): Promise<bigint> {
  if (!SEQUENCES.includes(sequence)) {
    throw new Error("Unknown sequence");
  }

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT nextval('${sequence}')::text AS id`,
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new Error(`Sequence ${sequence} did not return an id`);
  }
  return BigInt(id);
}
