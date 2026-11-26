export type SupabaseConfig = { url: string; key: string };
export function parseSupabaseConfig(
  url?: string,
  key?: string,
): SupabaseConfig | null {
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    )
      return null;
    if (
      parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname)
      )
    )
      return null;
    if (key.startsWith("sb_publishable_") && key.length > 15)
      return { url: parsed.origin, key };
    // Compatibilidad con anon JWT antiguo: rechazar service_role/secret antes de crear el cliente.
    const claims = JSON.parse(
      atob(key.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? ""),
    ) as { role?: string };
    return claims.role === "anon" ? { url: parsed.origin, key } : null;
  } catch {
    return null;
  }
}
export function getSupabaseConfig(): SupabaseConfig | null {
  return parseSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export function siteOrigin(): string | null {
  try {
    const configured =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
    if (!configured) return null;
    const u = new URL(configured);
    if (u.username || u.password || u.search || u.hash || u.pathname !== "/")
      return null;
    return u.protocol === "https:" ||
      (u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname))
      ? u.origin
      : null;
  } catch {
    return null;
  }
}
export function demoEnabled(): boolean {
  return (
    process.env.ENABLE_DEMO === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.ENABLE_DEMO !== "false")
  );
}
