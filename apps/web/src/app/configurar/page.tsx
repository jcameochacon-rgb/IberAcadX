import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { demoEnabled } from "@/lib/env";
export const dynamic = "force-dynamic";
export default function Configure() {
  return (
    <AuthShell>
      <h2 className="text-3xl font-semibold tracking-tight">
        Conecta tu escuela
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        La web ya está preparada. Falta configurar el proyecto de Supabase.
      </p>
      <ol className="mt-8 list-decimal space-y-5 pl-5 text-sm leading-6">
        <li>
          Instala el SQL de la base y crea tu primera cuenta de Dirección.
        </li>
        <li>
          Copia <code>.env.example</code> a <code>.env.local</code> en{" "}
          <code>apps/web</code>.
        </li>
        <li>
          Completa la URL del proyecto, su clave publicable y la dirección de
          esta web.
        </li>
        <li>Reinicia el servidor y vuelve a iniciar sesión.</li>
      </ol>
      <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Usa la clave publicable o anon. Una clave secreta o service_role no es
        válida para esta configuración.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/login">Volver al inicio</Link>
        </Button>
        {demoEnabled() && (
          <Button asChild variant="outline">
            <Link href="/demo">Ver demostración</Link>
          </Button>
        )}
      </div>
    </AuthShell>
  );
}
