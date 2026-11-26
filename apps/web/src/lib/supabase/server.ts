import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@iberdrola/shared";
import { getSupabaseConfig } from "@/lib/env";
export async function createClient() {
  const env = getSupabaseConfig();
  if (!env) throw new Error("Supabase no está configurado.");
  const store = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Proxy renueva cookies en Server Components. */
        }
      },
    },
  });
}
