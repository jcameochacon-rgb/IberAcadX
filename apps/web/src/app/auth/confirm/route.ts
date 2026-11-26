import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/env";
import { safeDestination } from "@/lib/auth-validation";
// Para invitaciones/recuperación abiertas desde otro navegador con plantilla token_hash.
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    token_hash &&
    token_hash.length < 2048 &&
    (type === "invite" || type === "recovery") &&
    getSupabaseConfig()
  ) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL(
          safeDestination(
            request.nextUrl.searchParams.get("next") || "/actualizar-clave",
          ),
          request.url,
        ),
        { headers: { "Cache-Control": "private, no-store" } },
      );
  }
  return NextResponse.redirect(new URL("/login?error=enlace", request.url), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
