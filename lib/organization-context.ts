import { createSupabaseServerClient } from "@/lib/supabase";

export async function getOrganizationContext() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: membership, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (error || !membership) return null;

    return {
      supabase,
      user,
      organizationId: membership.organization_id as string,
    };
  } catch {
    return null;
  }
}
