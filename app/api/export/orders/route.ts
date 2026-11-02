import { NextRequest, NextResponse } from "next/server";
import { getOrganizationContext } from "@/lib/organization-context";
import { escapeCsvCell } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext();
  if (!context) return NextResponse.redirect(new URL("/login?notice=signin-required", request.url));

  const { data, error } = await context.supabase
    .from("orders")
    .select("id,created_at,status,total_minor,currency,customers(name)")
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.redirect(new URL("/app/orders?error=save", request.url));

  const lines = [
    ["order_id", "created_at", "customer", "status", "total_minor", "currency"]
      .map(escapeCsvCell).join(","),
    ...(data ?? []).map((order) => [
      order.id,
      order.created_at,
      Array.isArray(order.customers) ? order.customers[0]?.name : (order.customers as { name?: string } | null)?.name,
      order.status,
      order.total_minor,
      order.currency,
    ].map(escapeCsvCell).join(",")),
  ];
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="businessflow-orders.csv"',
    },
  });
}
