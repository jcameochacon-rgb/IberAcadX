import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@iberdrola/shared";
import { getSupabaseConfig } from "@/lib/env";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const noCache = (r: NextResponse) => {
    r.headers.set("Cache-Control", "private, no-store, max-age=0");
    r.headers.set("Pragma", "no-cache");
    return r;
  };
  const redirect = (path: string) => {
    const redirected = NextResponse.redirect(new URL(path, request.url));
    response.cookies
      .getAll()
      .forEach((cookie) => redirected.cookies.set(cookie));
    return noCache(redirected);
  };
  const env = getSupabaseConfig();
  if (!env)
    return request.nextUrl.pathname.startsWith("/panel") ||
      request.nextUrl.pathname === "/actualizar-clave"
      ? redirect("/configurar")
      : noCache(response);
  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  try {
    const { data, error } = await supabase.auth.getClaims();
    const protectedPath =
      request.nextUrl.pathname.startsWith("/panel") ||
      ["/actualizar-clave", "/acceso-pendiente"].includes(
        request.nextUrl.pathname,
      );
    if (protectedPath && (error || !data?.claims?.sub))
      return redirect("/login");
  } catch {
    return redirect("/login?error=servicio");
  }
  return noCache(response);
}
export const config = {
  matcher: [
    "/panel/:path*",
    "/login",
    "/actualizar-clave",
    "/acceso-pendiente",
    "/auth/:path*",
  ],
};
