import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, getOrganizationContext } from "@/lib/organization-context";
import { organizationInvitationSchema, organizationSchema } from "@/lib/domain-validation";

export async function POST(request: NextRequest) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      const context = await getOrganizationContext();
      if (!context) {
        return NextResponse.redirect(new URL("/login?notice=signin-required", request.url));
      }
      return NextResponse.redirect(new URL("/app/organization?error=invalid", request.url));
    }
    const action = String(form.get("_action") ?? "create");

    if (action === "accept") {
      const authenticated = await getAuthenticatedContext();
      if (!authenticated) {
        return NextResponse.redirect(new URL("/login?notice=signin-required", request.url));
      }
      const token = String(form.get("token") ?? "");
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(token)) {
        return NextResponse.redirect(new URL("/app/organization?error=invalid", request.url));
      }
      const { data, error } = await authenticated.supabase.rpc("accept_organization_invitation", {
        invitation_token: token,
      });
      if (error || !data) {
        return NextResponse.redirect(new URL("/app/organization?error=invite", request.url));
      }
      const response = NextResponse.redirect(new URL("/app/organization?notice=joined", request.url));
      response.cookies.set("businessflow.organization_id", String(data), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      return response;
    }

    const context = await getOrganizationContext();
    if (!context) {
      return NextResponse.redirect(new URL("/login?notice=signin-required", request.url));
    }

    if (action === "create") {
      const parsed = organizationSchema.safeParse({ name: form.get("name") });
      if (!parsed.success) {
        return NextResponse.redirect(new URL("/app/organization?error=invalid", request.url));
      }
      const { data, error } = await context.supabase.rpc("create_organization", {
        new_name: parsed.data.name,
      });
      if (error || !data) {
        return NextResponse.redirect(new URL("/app/organization?error=save", request.url));
      }
      const response = NextResponse.redirect(new URL("/app/organization?notice=created", request.url));
      response.cookies.set("businessflow.organization_id", String(data), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      return response;
    }

    if (action === "rename") {
      const parsed = organizationSchema.safeParse({ name: form.get("name") });
      if (!parsed.success) {
        return NextResponse.redirect(new URL("/app/organization?error=invalid", request.url));
      }
      const { error } = await context.supabase.rpc("rename_organization", {
        target_organization_id: context.organizationId,
        new_name: parsed.data.name,
      });
      if (error) {
        return NextResponse.redirect(new URL("/app/organization?error=permission", request.url));
      }
      return NextResponse.redirect(new URL("/app/organization?notice=renamed", request.url));
    }

    if (action === "switch") {
      const organizationId = String(form.get("organization_id") ?? "");
      const memberships = await context.supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", context.user.id);
      const allowed = memberships.data?.some((membership) => membership.organization_id === organizationId);
      if (!allowed) {
        return NextResponse.redirect(new URL("/app/organization?error=permission", request.url));
      }
      const response = NextResponse.redirect(new URL("/app/organization?notice=switched", request.url));
      response.cookies.set("businessflow.organization_id", organizationId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      return response;
    }

    if (action === "invite") {
      const parsed = organizationInvitationSchema.safeParse({
        email: form.get("email"),
        role: form.get("role"),
      });
      if (!parsed.success) {
        return NextResponse.redirect(new URL("/app/organization?error=invalid", request.url));
      }
      const { error } = await context.supabase.from("organization_invitations").insert({
        organization_id: context.organizationId,
        invited_email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        invited_by: context.user.id,
      });
      if (error) {
        return NextResponse.redirect(new URL("/app/organization?error=permission", request.url));
      }
      return NextResponse.redirect(new URL("/app/organization?notice=invited", request.url));
    }

    if (action === "cancel") {
      const invitationId = String(form.get("invitation_id") ?? "");
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(invitationId)) {
        return NextResponse.redirect(new URL("/app/organization?error=invalid", request.url));
      }
      const { error } = await context.supabase
        .from("organization_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId)
        .eq("organization_id", context.organizationId);
      if (error) {
        return NextResponse.redirect(new URL("/app/organization?error=permission", request.url));
      }
      return NextResponse.redirect(new URL("/app/organization?notice=cancelled", request.url));
    }

    return NextResponse.redirect(new URL("/app/organization?error=invalid", request.url));
  } catch {
    return NextResponse.redirect(new URL("/app/organization?error=configuration", request.url));
  }
}
