import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as customerPost } from "./customers/route";
import { POST as orderPost } from "./orders/route";
import { POST as paymentPost } from "./payments/route";
import { POST as followUpPost } from "./follow-ups/route";
import { GET as exportOrders } from "./export/orders/route";
import { POST as organizationPost } from "./organizations/route";
import { getAuthenticatedContext, getOrganizationContext } from "@/lib/organization-context";

vi.mock("@/lib/organization-context", () => ({
  getOrganizationContext: vi.fn(),
  getAuthenticatedContext: vi.fn(),
}));

const mockedContext = vi.mocked(getOrganizationContext);
const mockedAuthenticatedContext = vi.mocked(getAuthenticatedContext);

describe("unauthenticated API requests", () => {
  beforeEach(() => {
    mockedContext.mockResolvedValue(null);
    mockedAuthenticatedContext.mockResolvedValue(null);
  });

  it("redirects customer mutations to login", async () => {
    const request = new NextRequest("http://localhost/app/customers", { method: "POST" });
    const response = await customerPost(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?notice=signin-required");
  });

  it("redirects order mutations to login", async () => {
    const request = new NextRequest("http://localhost/app/orders", { method: "POST" });
    const response = await orderPost(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?notice=signin-required");
  });

  it("redirects payment mutations to login", async () => {
    const request = new NextRequest("http://localhost/app/orders", { method: "POST" });
    const response = await paymentPost(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?notice=signin-required");
  });

  it("redirects follow-up mutations to login", async () => {
    const request = new NextRequest("http://localhost/app/follow-ups", { method: "POST" });
    const response = await followUpPost(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?notice=signin-required");
  });

  it("redirects CSV export requests to login", async () => {
    const request = new NextRequest("http://localhost/api/export/orders");
    const response = await exportOrders(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?notice=signin-required");
  });

  it("redirects organization mutations to login", async () => {
    const request = new NextRequest("http://localhost/api/organizations", { method: "POST" });
    const response = await organizationPost(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?notice=signin-required");
  });

  it("redirects organization creation and modification to login", async () => {
    for (const action of ["create", "rename"]) {
      const request = new NextRequest("http://localhost/api/organizations", {
        method: "POST",
        body: new URLSearchParams({
          _action: action,
          name: "Organisation test",
        }),
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
      const response = await organizationPost(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login?notice=signin-required");
    }
  });

  it("redirects invitation acceptance to login when unauthenticated", async () => {
    const request = new NextRequest("http://localhost/api/organizations", {
      method: "POST",
      body: new URLSearchParams({
        _action: "accept",
        token: "00000000-0000-4000-8000-000000000000",
      }),
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    const response = await organizationPost(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?notice=signin-required");
  });
});
