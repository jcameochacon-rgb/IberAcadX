import { notFound } from "next/navigation";
import { isRole, isModule } from "@iberdrola/shared";
import { ModulePage } from "@/components/module-page";
import { demoEnabled } from "@/lib/env";
import { demoPanel } from "@/lib/data/demo";
export const dynamic = "force-dynamic";
export default async function DemoModule({
  params,
  searchParams,
}: {
  params: Promise<{ modulo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!demoEnabled()) notFound();
  const { modulo } = await params;
  const { rol } = await searchParams;
  if (!isModule(modulo)) notFound();
  return (
    <ModulePage
      model={demoPanel(isRole(rol) ? rol : "DIRECTOR")}
      module={modulo}
    />
  );
}
