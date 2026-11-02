import { NextRequest, NextResponse } from "next/server";
import { getOrganizationContext } from "@/lib/organization-context";
import { paymentSchema } from "@/lib/domain-validation";
import { validatePaymentMinor } from "@/lib/money";

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext();
    if (!context) return NextResponse.redirect(new URL("/login?notice=signin-required", request.url));
    const form = await request.formData();
    const paidAtInput = String(form.get("paidAt") ?? "");
    const paidAt = paidAtInput ? new Date(paidAtInput).toISOString() : "";
    const parsed = paymentSchema.safeParse({
      amountMinor: Number(form.get("amountMinor")),
      paidAt,
      method: form.get("method"),
      reference: form.get("reference") || undefined,
    });
    const orderId = String(form.get("orderId") ?? "");
    if (!parsed.success || !orderId) {
      return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));
    }

    const { data: order, error } = await context.supabase
      .from("orders")
      .select("id,total_minor,status")
      .eq("id", orderId)
      .eq("organization_id", context.organizationId)
      .single();
    if (error || !order) return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));
    if (order.status === "cancelled") return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));

    const payments = await context.supabase
      .from("payments")
      .select("amount_minor")
      .eq("order_id", orderId)
      .eq("organization_id", context.organizationId)
      .eq("status", "recorded");
    const paidMinor = (payments.data ?? []).reduce((sum, payment) => sum + payment.amount_minor, 0);
    let amountMinor: number;
    try {
      amountMinor = validatePaymentMinor(parsed.data.amountMinor, order.total_minor - paidMinor);
    } catch {
      return NextResponse.redirect(new URL("/app/orders?error=invalid", request.url));
    }

    const { error: insertError } = await context.supabase.from("payments").insert({
      organization_id: context.organizationId,
      order_id: orderId,
      amount_minor: amountMinor,
      paid_at: parsed.data.paidAt,
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      status: "recorded",
      recorded_by: context.user.id,
    });
    if (insertError) return NextResponse.redirect(new URL("/app/orders?error=save", request.url));
    return NextResponse.redirect(new URL("/app/orders?notice=payment-recorded", request.url));
  } catch {
    return NextResponse.redirect(new URL("/app/orders?error=configuration", request.url));
  }
}
