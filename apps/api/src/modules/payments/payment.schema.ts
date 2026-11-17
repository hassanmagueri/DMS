import { z } from "zod";

export const checkoutSchema = z.object({
  deliveryId: z.number().int().positive(),
  method: z.literal("CASH_ON_DELIVERY"),
});

export const refundSchema = z.object({
  amount: z.string().regex(/^\d+\.\d{2}$/, "Amount must use two decimal places"),
  reason: z.string().trim().max(500).optional(),
});

export const mockCompleteSchema = z.object({
  outcome: z.enum(["succeeded", "failed"]),
});
