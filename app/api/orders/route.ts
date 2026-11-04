import { NextRequest, NextResponse } from "next/server";
import { getOrganizationContext } from "@/lib/organization-context";
import { orderSchema } from "@/lib/domain-validation";
import { orderTotalMinor } from "@/lib/money";

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext();
    if (!context) return NextResponse.redirect(new URL("/login?notice=signin-required", request.url));

    const form = await request.formData();
    const action = String(form.get("_action") ?? "create");
    if (action === "update_status") {
      const orderId = String(form.get("orderId") ?? "");
      const status = String(form.get("status") ?? "");
      if (!orderId || !["draft", "confirmed", "delivered", "paid", "cancelled"].includes(status)) {
        return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));
      }
      const { data: order, error: orderError } = await context.supabase
        .from("orders")
        .select("id,total_minor,status")
        .eq("id", orderId)
        .eq("organization_id", context.organizationId)
        .single();
      if (orderError || !order) return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));
      if (status === "paid") {
        const { data: paymentRows } = await context.supabase
          .from("payments")
          .select("amount_minor")
          .eq("order_id", orderId)
          .eq("organization_id", context.organizationId)
          .eq("status", "recorded");
        const paidMinor = (paymentRows ?? []).reduce((sum, payment) => sum + payment.amount_minor, 0);
        if (paidMinor !== order.total_minor) {
          return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));
        }
      }
      if (status === "cancelled") {
        const { data: paymentRows } = await context.supabase
          .from("payments")
          .select("id")
          .eq("order_id", orderId)
          .eq("organization_id", context.organizationId)
          .eq("status", "recorded")
          .limit(1);
        if ((paymentRows?.length ?? 0) > 0) {
          return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));
        }
      }
      const result = await context.supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId)
        .eq("organization_id", context.organizationId);
      if (result.error) return NextResponse.redirect(new URL("/app/orders?error=save", request.url));
      return NextResponse.redirect(new URL("/app/orders?notice=status-updated", request.url));
    }
    const items = Array.from({ length: 10 }, (_, index) => {
      const description = form.get(`description_${index}`);
      const quantity = form.get(`quantity_${index}`);
      const unitPriceMinor = form.get(`unitPriceMinor_${index}`);
      if (!description && !quantity && !unitPriceMinor) return null;
      return {
        description,
        quantity: Number(quantity),
        unitPriceMinor: Number(unitPriceMinor),
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    const parsed = orderSchema.safeParse({
      customerId: String(form.get("customerId") ?? ""),
      items,
    });
    if (!parsed.success) return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));

    const customer = await context.supabase
      .from("customers")
      .select("id")
      .eq("id", parsed.data.customerId)
      .eq("organization_id", context.organizationId)
      .single();
    if (customer.error || !customer.data) {
      return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));
    }

    const totalMinor = orderTotalMinor(
      parsed.data.items.map((item) => item.quantity * item.unitPriceMinor),
    );
    const idempotencyKey = String(form.get("idempotencyKey") ?? "").slice(0, 100);
    if (!idempotencyKey) return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));
    const existing = await context.supabase
      .from("orders")
      .select("id")
      .eq("organization_id", context.organizationId)
      .eq("idempotency_key", idempotencyKey)
      .limit(1)
      .maybeSingle();
    if (existing.data) return NextResponse.redirect(new URL("/app/orders?notice=created", request.url));
    const order = await context.supabase
      .from("orders")
      .insert({
        organization_id: context.organizationId,
        customer_id: parsed.data.customerId,
        created_by: context.user.id,
        status: "confirmed",
        total_minor: totalMinor,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (order.error || !order.data) {
      return NextResponse.redirect(new URL("/app/orders?error=save", request.url));
    }

    const lineResult = await context.supabase.from("order_items").insert(
      parsed.data.items.map((item) => ({
        organization_id: context.organizationId,
        order_id: order.data!.id,
        description: item.description,
        quantity: item.quantity,
        unit_price_minor: item.unitPriceMinor,
        line_total_minor: item.quantity * item.unitPriceMinor,
      })),
    );
    if (lineResult.error) {
      await context.supabase.from("orders").delete().eq("id", order.data.id).eq("organization_id", context.organizationId);
      return NextResponse.redirect(new URL("/app/orders?error=save", request.url));
    }

    return NextResponse.redirect(new URL("/app/orders?notice=created", request.url));
  } catch {
    return NextResponse.redirect(new URL("/app/orders?error=configuration", request.url));
  }
}
