import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/env";
import { isRole } from "@iberdrola/shared";
export const requireIdentity = cache(async () => {
  if (!getSupabaseConfig()) redirect("/configurar");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
});
export const requireProfile = cache(async () => {
  const { supabase, user } = await requireIdentity();
  const { data: profile, error } = await supabase
    .from("perfiles")
    .select("id,persona_id,rol,activo")
    .eq("id", user.id)
    .maybeSingle();
  if (error)
    throw new Error(
      "No se pudo cargar el perfil institucional. Comprueba la instalación de la base.",
    );
  if (!profile?.activo || !isRole(profile.rol)) redirect("/acceso-pendiente");
  const { data: person, error: personError } = await supabase
    .from("personas")
    .select("nombres,apellido_paterno,apellido_materno")
    .eq("id", profile.persona_id)
    .single();
  if (personError || !person)
    throw new Error("No se pudo cargar la ficha personal del usuario.");
  return {
    supabase,
    user,
    profile,
    name: [person.nombres, person.apellido_paterno, person.apellido_materno]
      .filter(Boolean)
      .join(" "),
  };
});
