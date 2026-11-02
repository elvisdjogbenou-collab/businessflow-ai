import { z } from "zod";

export const customerSchema = z.object({
  kind: z.enum(["lead", "customer"]),
  name: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
});

export const paymentSchema = z.object({
  amountMinor: z.number().int().positive().safe(),
  paidAt: z.string().datetime({ offset: true }),
  method: z.enum(["cash", "mobile_money", "bank_transfer", "check", "other"]),
  reference: z.string().trim().max(100).optional().or(z.literal("")),
});

export const orderItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().int().positive().max(1000000),
  unitPriceMinor: z.number().int().nonnegative().safe(),
});

export const orderSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(orderItemSchema).min(1).max(100),
});
