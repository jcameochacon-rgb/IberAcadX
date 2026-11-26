import { notFound } from "next/navigation";
import { isRole } from "@iberdrola/shared";
import { demoEnabled } from "@/lib/env";
import { demoPanel } from "@/lib/data/demo";
import { PanelShell } from "@/components/panel-shell";
import { CrudHeading } from "@/components/crud-heading";
import { DemoOperation } from "@/components/demo-operation";
import {
  titles,
  allowedActions,
  readAction,
  type WorkspaceModule,
} from "@/lib/workspace-navigation";
export const dynamic = "force-dynamic";
export default async function DemoOperations({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!demoEnabled()) notFound();
  const p = await searchParams,
    role = isRole(p.rol) ? p.rol : "DIRECTOR";
  if (typeof p.modulo !== "string" || !Object.hasOwn(titles, p.modulo))
    notFound();
  const selectedModule = p.modulo as WorkspaceModule,
    action = readAction(p.accion);
  if (!allowedActions(role, selectedModule).includes(action)) notFound();
  return (
    <PanelShell model={demoPanel(role)}>
      <CrudHeading module={selectedModule} action={action} />
      <DemoOperation
        key={`${role}-${selectedModule}-${action}`}
        module={selectedModule}
        action={action}
      />
    </PanelShell>
  );
}
