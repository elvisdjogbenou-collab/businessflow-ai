import { NextRequest, NextResponse } from "next/server";
import { getOrganizationContext } from "@/lib/organization-context";

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext();
    if (!context) return NextResponse.redirect(new URL("/login?notice=signin-required", request.url));

    const form = await request.formData();
    const action = String(form.get("_action") ?? "create");
    const id = String(form.get("id") ?? "");

    if (action === "complete" && id) {
      const result = await context.supabase
        .from("follow_up_tasks")
        .update({ status: "completed" })
        .eq("id", id)
        .eq("organization_id", context.organizationId);
      if (result.error) return NextResponse.redirect(new URL("/app/follow-ups?error=save", request.url));
      return NextResponse.redirect(new URL("/app/follow-ups?notice=completed", request.url));
    }

    const title = String(form.get("title") ?? "").trim();
    const dueAt = String(form.get("dueAt") ?? "");
    const customerId = String(form.get("customerId") ?? "");
    if (title.length < 2 || title.length > 200 || !dueAt) {
      return NextResponse.redirect(new URL("/app/follow-ups?error=invalid", request.url));
    }
    const result = await context.supabase.from("follow_up_tasks").insert({
      organization_id: context.organizationId,
      customer_id: customerId || null,
      assigned_to: context.user.id,
      title,
      notes: String(form.get("notes") ?? "").trim() || null,
      due_at: dueAt,
      status: "pending",
    });
    if (result.error) return NextResponse.redirect(new URL("/app/follow-ups?error=save", request.url));
    return NextResponse.redirect(new URL("/app/follow-ups?notice=created", request.url));
  } catch {
    return NextResponse.redirect(new URL("/app/follow-ups?error=configuration", request.url));
  }
}
