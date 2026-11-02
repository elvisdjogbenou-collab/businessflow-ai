import { describe, expect, it } from "vitest";
import { customerSchema, orderSchema, paymentSchema } from "./domain-validation";
import { orderTotalMinor, remainingBalance, validatePaymentMinor } from "./money";
import { escapeLikePattern } from "./postgrest";
import { escapeCsvCell } from "./csv";

describe("money calculations", () => {
  it("calculates an order total from integer minor units", () => {
    expect(orderTotalMinor([12500, 3400])).toBe(15900);
  });

  it("calculates a partial-payment balance", () => {
    expect(remainingBalance(15900, 5000)).toBe(10900);
  });

  it("never reports a negative remaining balance", () => {
    expect(remainingBalance(5000, 7500)).toBe(0);
  });

  it("rejects negative and fractional amounts", () => {
    expect(() => remainingBalance(-1, 0)).toThrow();
    expect(() => remainingBalance(10.5, 0)).toThrow();
  });

  it("rejects payments that exceed the remaining balance", () => {
    expect(validatePaymentMinor(5000, 5000)).toBe(5000);
    expect(() => validatePaymentMinor(5001, 5000)).toThrow("Payment exceeds remaining balance.");
    expect(() => validatePaymentMinor(0, 5000)).toThrow();
  });

  it("validates customer identity and lead/customer kind", () => {
    expect(customerSchema.parse({
      kind: "customer",
      name: "  Jean Dupont  ",
      email: "jean@example.com",
    }).name).toBe("Jean Dupont");
    expect(() => customerSchema.parse({ kind: "customer", name: "" })).toThrow();
  });

  it("validates payment amount, date and method", () => {
    const payment = {
      amountMinor: 12500,
      paidAt: "2026-11-02T15:00:00.000Z",
      method: "cash",
    };
    expect(paymentSchema.parse(payment)).toEqual(payment);
    expect(() => paymentSchema.parse({ ...payment, amountMinor: -1 })).toThrow();
    expect(() => paymentSchema.parse({ ...payment, paidAt: "not-a-date" })).toThrow();
  });

  it("escapes PostgREST LIKE pattern characters in customer search", () => {
    expect(escapeLikePattern("100%_test\\name,")).toBe("100\\%\\_test\\\\name\\,");
  });

  it("validates a complete order and rejects invalid line items", () => {
    const order = {
      customerId: "5b9f3f1d-ae9e-4d55-8d3e-3fc2cf55df8a",
      items: [{ description: "Audit", quantity: 2, unitPriceMinor: 12500 }],
    };
    expect(orderSchema.parse(order)).toEqual(order);
    expect(() => orderSchema.parse({ ...order, items: [{ description: "", quantity: 0, unitPriceMinor: -1 }] })).toThrow();
  });

  it("neutralizes spreadsheet formula prefixes in CSV exports", () => {
    expect(escapeCsvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(escapeCsvCell("+SUM(A1:A2)")).toBe("\"'+SUM(A1:A2)\"");
    expect(escapeCsvCell("@customer")).toBe("\"'@customer\"");
    expect(escapeCsvCell("Ordinary customer")).toBe("\"Ordinary customer\"");
  });
});
