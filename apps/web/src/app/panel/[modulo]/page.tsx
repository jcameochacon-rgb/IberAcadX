import { notFound } from "next/navigation";
import { isModule } from "@iberdrola/shared";
import { ModulePage } from "@/components/module-page";
import { loadPanel } from "@/lib/data/live";
export default async function Module({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  if (!isModule(modulo)) notFound();
  return <ModulePage model={await loadPanel()} module={modulo} />;
}
