import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as customerPost } from "./customers/route";
import { POST as orderPost } from "./orders/route";
import { POST as paymentPost } from "./payments/route";
import { POST as followUpPost } from "./follow-ups/route";
import { GET as exportOrders } from "./export/orders/route";
import { getOrganizationContext } from "@/lib/organization-context";

vi.mock("@/lib/organization-context", () => ({
  getOrganizationContext: vi.fn(),
}));

const mockedContext = vi.mocked(getOrganizationContext);

describe("unauthenticated API requests", () => {
  beforeEach(() => {
    mockedContext.mockResolvedValue(null);
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
});
