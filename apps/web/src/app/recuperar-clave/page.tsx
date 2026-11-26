import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { getSupabaseConfig } from "@/lib/env";
export const dynamic = "force-dynamic";
export default function Recover() {
  return (
    <AuthShell>
      <h2 className="text-3xl font-semibold tracking-tight">
        Recupera tu acceso
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Te enviaremos un enlace para establecer una nueva contraseña.
      </p>
      <AuthForm mode="recover" configured={!!getSupabaseConfig()} />
      <Link
        className="mt-6 inline-block text-sm font-medium text-primary"
        href="/login"
      >
        ← Volver al inicio de sesión
      </Link>
    </AuthShell>
  );
}
