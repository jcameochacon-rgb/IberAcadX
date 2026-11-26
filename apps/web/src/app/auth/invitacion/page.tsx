import { AuthShell } from "@/components/auth-shell";
import { InvitationAccess } from "./session";
export const dynamic = "force-dynamic";
export default function Invitation() {
  return (
    <AuthShell compact>
      <h2 className="text-3xl font-semibold">Activa tu cuenta</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Verificaremos la invitación y podrás crear tu contraseña personal.
      </p>
      <InvitationAccess />
    </AuthShell>
  );
}
