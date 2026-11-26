import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/env";
import { safeDestination } from "@/lib/auth-validation";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code)
    return NextResponse.redirect(new URL("/auth/invitacion", request.url), {
      headers: { "Cache-Control": "private, no-store" },
    });
  if (code && getSupabaseConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          safeDestination(request.nextUrl.searchParams.get("next")),
          request.url,
        ),
        { headers: { "Cache-Control": "private, no-store" } },
      );
  }
  return NextResponse.redirect(new URL("/login?error=enlace", request.url), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
