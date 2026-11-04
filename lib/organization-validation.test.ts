import { describe, expect, it } from "vitest";
import { organizationInvitationSchema, organizationSchema } from "./domain-validation";

describe("organization validation", () => {
  it("accepts valid organization names", () => {
    expect(organizationSchema.safeParse({ name: "  Boutique Centrale  " }).success).toBe(true);
  });

  it("rejects names outside the allowed length", () => {
    expect(organizationSchema.safeParse({ name: " " }).success).toBe(false);
    expect(organizationSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
  });

  it("accepts only manager and member invitation roles", () => {
    expect(organizationInvitationSchema.safeParse({
      email: "member@example.com",
      role: "member",
    }).success).toBe(true);
    expect(organizationInvitationSchema.safeParse({
      email: "manager@example.com",
      role: "manager",
    }).success).toBe(true);
    expect(organizationInvitationSchema.safeParse({
      email: "owner@example.com",
      role: "owner",
    }).success).toBe(false);
  });

  it("rejects malformed invitation emails", () => {
    expect(organizationInvitationSchema.safeParse({
      email: "not-an-email",
      role: "member",
    }).success).toBe(false);
  });
});
