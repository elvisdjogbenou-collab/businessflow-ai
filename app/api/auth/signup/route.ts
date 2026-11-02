import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase";

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const parsed = credentialsSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/signup?error=invalid", request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: new URL("/auth/callback", request.url).toString(),
      },
    });
    if (error) {
      return NextResponse.redirect(new URL("/signup?error=signup", request.url));
    }
    return NextResponse.redirect(new URL("/login?notice=check-email", request.url));
  } catch {
    return NextResponse.redirect(new URL("/signup?error=configuration", request.url));
  }
}
