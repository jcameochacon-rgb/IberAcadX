import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { requireIdentity } from "@/lib/auth";
import { logout } from "@/app/actions";
export const dynamic = "force-dynamic";
export default async function Pending() {
  await requireIdentity();
  return (
    <AuthShell>
      <h2 className="text-3xl font-semibold tracking-tight">
        Acceso pendiente
      </h2>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Tu cuenta pudo iniciar sesión, pero aún no tiene un perfil institucional
        activo. Dirección debe vincularla a tu ficha y asignar el rol
        correspondiente.
      </p>
      <form action={logout} className="mt-8">
        <Button type="submit" variant="outline">
          Cerrar sesión
        </Button>
      </form>
    </AuthShell>
  );
}
