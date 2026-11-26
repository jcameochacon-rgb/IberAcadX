"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { invitationSession } from "@/lib/invitation";
export function InvitationAccess() {
  const started = useRef(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const tokens = invitationSession(window.location.hash);
    window.history.replaceState(null, "", "/auth/invitacion");
    async function verify() {
      try {
        if (!tokens) {
          setError(
            "El enlace no es válido o ya fue utilizado. Solicita una nueva invitación o recupera tu contraseña.",
          );
          return;
        }
        const db = createClient();
        const result = await db.auth.setSession(tokens);
        if (result.error) {
          setError(
            "La invitación venció o fue utilizada. Solicita un nuevo enlace.",
          );
          return;
        }
        const identity = await db.auth.getUser();
        if (identity.error || !identity.data.user) {
          setError("No se pudo verificar la cuenta. Solicita un nuevo enlace.");
          return;
        }
        window.location.replace("/actualizar-clave");
      } catch {
        setError(
          "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo desde el correo.",
        );
      }
    }
    void verify();
  }, []);
  return (
    <div className="mt-6">
      {error ? (
        <>
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
          <Link
            href="/recuperar-clave"
            className="mt-5 inline-block font-medium text-primary"
          >
            Solicitar recuperación de contraseña
          </Link>
        </>
      ) : (
        <p
          role="status"
          className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800"
        >
          Verificando tu invitación…
        </p>
      )}
    </div>
  );
}
