"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@iberdrola/shared";
import { getSupabaseConfig } from "@/lib/env";
export function createClient() {
  const env = getSupabaseConfig();
  if (!env) throw new Error("Supabase no está configurado.");
  return createBrowserClient<Database>(env.url, env.key, {
    auth: { detectSessionInUrl: false },
  });
}
