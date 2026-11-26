"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireIdentity } from "@/lib/auth";
import { getSupabaseConfig, siteOrigin } from "@/lib/env";
import {
  validEmail,
  validPassword,
  type FormState,
} from "@/lib/auth-validation";
export async function login(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (!getSupabaseConfig())
    return { error: "Primero configura la conexión del proyecto." };
  const email = String(form.get("email") || "").trim();
  const password = form.get("password");
  if (
    !validEmail(email) ||
    typeof password !== "string" ||
    !password ||
    password.length > 256
  )
    return { error: "Ingresa un correo válido y tu contraseña." };
  const supabase = await createClient();
  const captchaToken = form.get("captchaToken");
  if (
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
    (typeof captchaToken !== "string" ||
      !captchaToken ||
      captchaToken.length > 2048)
  )
    return {
      error: "Completa la verificación de seguridad antes de continuar.",
    };
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken:
          typeof captchaToken === "string" ? captchaToken : undefined,
      },
    });
    if (error)
      return {
        error:
          error.code === "captcha_failed"
            ? "La verificación de seguridad no fue válida. Intenta de nuevo."
            : error.code === "over_request_rate_limit"
              ? "Demasiados intentos. Espera unos minutos."
              : "No pudimos iniciar sesión. Revisa tus datos y la activación de tu cuenta.",
      };
  } catch {
    return { error: "No se pudo contactar al servicio. Intenta de nuevo." };
  }
  redirect("/panel");
}
export async function logout() {
  const supabase = await createClient();
  const { error: logoutError } = await supabase.auth.signOut({
    scope: "local",
  });
  if (logoutError)
    throw new Error("No se pudo cerrar la sesión. Intenta de nuevo.");
  redirect("/login");
}
export async function recoverPassword(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  if (!getSupabaseConfig())
    return { error: "Primero configura la conexión del proyecto." };
  const email = String(form.get("email") || "").trim();
  const origin = siteOrigin();
  if (!validEmail(email)) return { error: "Ingresa un correo válido." };
  if (!origin)
    return {
      error: "El administrador debe configurar la dirección de la web.",
    };
  const captchaToken = form.get("captchaToken");
  if (
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
    (typeof captchaToken !== "string" ||
      !captchaToken ||
      captchaToken.length > 2048)
  )
    return {
      error: "Completa la verificación de seguridad antes de continuar.",
    };
  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/actualizar-clave`,
      captchaToken:
        typeof form.get("captchaToken") === "string"
          ? String(form.get("captchaToken"))
          : undefined,
    });
    if (error?.code === "captcha_failed")
      return {
        error: "La verificación de seguridad no fue válida. Intenta de nuevo.",
      };
    if (
      error &&
      ["over_email_send_rate_limit", "over_request_rate_limit"].includes(
        error.code || "",
      )
    )
      return { error: "Espera unos minutos antes de solicitar otro enlace." };
    if (error && error.code !== "user_not_found")
      return {
        error:
          "No se pudo enviar el correo. Revisa la configuración con el administrador.",
      };
  } catch {
    return { error: "No se pudo contactar al servicio. Intenta de nuevo." };
  }
  return {
    success:
      "Si el correo corresponde a una cuenta habilitada, recibirás un enlace para cambiar tu contraseña.",
  };
}
export async function updatePassword(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const { supabase } = await requireIdentity();
  const password = form.get("password"),
    confirm = form.get("confirm");
  if (!validPassword(password, confirm))
    return {
      error: "Usa entre 12 y 128 caracteres y confirma la misma contraseña.",
    };
  const { error } = await supabase.auth.updateUser({ password });
  if (error)
    return {
      error:
        "No pudimos actualizar tu contraseña. Solicita otro enlace o revisa la política de contraseñas.",
    };
  const { error: logoutError } = await supabase.auth.signOut({
    scope: "local",
  });
  if (logoutError)
    throw new Error("No se pudo cerrar la sesión. Intenta de nuevo.");
  redirect("/login?mensaje=clave-actualizada");
}
