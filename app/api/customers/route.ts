import { NextRequest, NextResponse } from "next/server";
import { customerSchema } from "@/lib/domain-validation";
import { getOrganizationContext } from "@/lib/organization-context";

export async function POST(request: NextRequest) {
  try {
    const context = await getOrganizationContext();
    if (!context) return NextResponse.redirect(new URL("/login?notice=signin-required", request.url));

    const form = await request.formData();
    const action = String(form.get("_action") ?? "create");
    const id = typeof form.get("id") === "string" ? String(form.get("id")) : null;

    if (action === "delete") {
      if (!id) return NextResponse.redirect(new URL("/app/customers?error=invalid", request.url));
      const { error } = await context.supabase
        .from("customers")
        .delete()
        .eq("id", id)
        .eq("organization_id", context.organizationId);
      if (error) return NextResponse.redirect(new URL("/app/customers?error=save", request.url));
      return NextResponse.redirect(new URL("/app/customers?notice=deleted", request.url));
    }

    const parsed = customerSchema.safeParse({
      kind: form.get("kind"),
      name: form.get("name"),
      phone: form.get("phone") || undefined,
      email: form.get("email") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.redirect(new URL("/app/customers?error=invalid", request.url));
    }

    const payload = {
      ...parsed.data,
      organization_id: context.organizationId,
    };

    const result = action === "update" && id
      ? await context.supabase.from("customers").update(payload).eq("id", id).eq("organization_id", context.organizationId)
      : await context.supabase.from("customers").insert(payload);

    if (result.error) {
      return NextResponse.redirect(new URL("/app/customers?error=save", request.url));
    }
    return NextResponse.redirect(new URL(`/app/customers?notice=${action === "update" ? "updated" : "created"}`, request.url));
  } catch {
    return NextResponse.redirect(new URL("/app/customers?error=configuration", request.url));
  }
}
