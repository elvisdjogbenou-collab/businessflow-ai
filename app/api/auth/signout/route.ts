import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // The session cookie is server-owned; the user is returned to login regardless.
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
