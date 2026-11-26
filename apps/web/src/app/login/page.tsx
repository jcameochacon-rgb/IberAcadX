import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { getSupabaseConfig, demoEnabled } from "@/lib/env";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const configured = !!getSupabaseConfig();
  return (
    <AuthShell compact>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-primary">
        Acceso institucional
      </p>
      <h2 className="text-3xl font-semibold tracking-tight">Inicia sesión</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Accede a tu espacio académico de IberAcad.
      </p>
      {!configured && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          La conexión aún no está configurada.{" "}
          <Link className="font-semibold underline" href="/configurar">
            Ver instrucciones
          </Link>
        </div>
      )}
      {params.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {params.error === "enlace"
            ? "El enlace no es válido o expiró. Solicita uno nuevo."
            : "El servicio no está disponible. Intenta de nuevo."}
        </p>
      )}
      {params.mensaje === "clave-actualizada" && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          Contraseña actualizada. Ya puedes iniciar sesión.
        </p>
      )}
      <AuthForm mode="login" configured={configured} />
      <div className="mt-4 text-right">
        <Link
          className="text-sm font-medium text-primary hover:underline"
          href="/recuperar-clave"
        >
          Olvidé mi contraseña
        </Link>
      </div>
      <div className="mt-6 border-t border-border pt-4">
        <p className="text-center text-xs leading-5 text-muted-foreground">
          ¿Todavía no tienes acceso? Contacta a Secretaría.
          <br />
          La institución administra las cuentas.
        </p>
        {demoEnabled() && (
          <Link
            className="mt-4 block text-center text-sm font-semibold text-primary hover:underline"
            href="/demo"
          >
            Explorar demostración visual →
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
