import { createSupabaseServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function getOrganizationContext() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: membership, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(100);
    if (error || !membership) return null;
    const cookieStore = await cookies();
    const selectedOrganizationId = cookieStore.get("businessflow.organization_id")?.value;
    const selectedMembership = membership.find((item) =>
      item.organization_id === selectedOrganizationId
    );
    const activeMembership = selectedMembership ?? membership[0];
    if (!activeMembership) return null;

    return {
      supabase,
      user,
      organizationId: activeMembership.organization_id as string,
    };
  } catch {
    return null;
  }
}

export async function getAuthenticatedContext() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { supabase, user };
  } catch {
    return null;
  }
}
