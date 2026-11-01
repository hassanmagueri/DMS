import { z } from "zod";

export const DELIVERY_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "ACCEPTED",
  "REJECTED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const addressSchema = z.object({
  street: z.string().trim().min(1, "Street is required").max(255),
  city: z.string().trim().min(1, "City is required").max(255),
  state: z.string().trim().max(255).optional(),
  postalCode: z.string().trim().max(255).optional(),
  country: z.string().trim().min(1, "Country is required").max(255),
});

export const createDeliverySchema = z.object({
  customerId: z.number().int().positive().optional(),
  weight: z.number().positive("Weight must be greater than 0").max(100000),
  pickup: addressSchema,
  dropoff: addressSchema,
});

export const updateDeliverySchema = createDeliverySchema.partial();

export const assignDriverSchema = z.object({
  driverId: z.number().int().positive(),
});

export const DETAIL_EDITABLE = ["PENDING", "ASSIGNED", "ACCEPTED", "REJECTED"] as const;

export const updateStatusSchema = z.object({
  status: z.enum(DELIVERY_STATUSES),
});

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const operatorTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: ["CANCELLED"],
  ASSIGNED: ["CANCELLED"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: ["CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};

const driverTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: [],
  ASSIGNED: [],
  ACCEPTED: ["PICKED_UP"],
  REJECTED: [],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};

const customerTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: ["CANCELLED"],
  ASSIGNED: ["CANCELLED"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: ["CANCELLED"],
  PICKED_UP: [],
  IN_TRANSIT: [],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};

export function nextStatuses(from: string, role: string): DeliveryStatus[] {
  if (!DELIVERY_STATUSES.includes(from as DeliveryStatus)) return [];
  const current = from as DeliveryStatus;
  if (role === "DRIVER") return driverTransitions[current];
  if (role === "CUSTOMER") return customerTransitions[current];
  if (role === "ADMIN" || role === "DISPATCHER") return operatorTransitions[current];
  return [];
}

export const ASSIGNABLE = ["PENDING", "REJECTED", "ASSIGNED"] as const;
export const ACTIVE = ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"] as const;
