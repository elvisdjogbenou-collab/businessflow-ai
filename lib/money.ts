import { z } from "zod";

export const minorUnitSchema = z.number().int().nonnegative().safe();

export function remainingBalance(totalMinor: number, paymentsMinor: number): number {
  const total = minorUnitSchema.parse(totalMinor);
  const payments = minorUnitSchema.parse(paymentsMinor);
  return Math.max(0, total - payments);
}

export function orderTotalMinor(lineTotalsMinor: number[]): number {
  const total = lineTotalsMinor.reduce((sum, lineTotal) => {
    return sum + minorUnitSchema.parse(lineTotal);
  }, 0);
  return minorUnitSchema.parse(total);
}

export function validatePaymentMinor(amountMinor: number, remainingMinor: number): number {
  const amount = minorUnitSchema.refine((value) => value > 0).parse(amountMinor);
  const remaining = minorUnitSchema.parse(remainingMinor);
  if (amount > remaining) {
    throw new Error("Payment exceeds remaining balance.");
  }
  return amount;
}
