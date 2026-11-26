import { notFound } from "next/navigation";
import { isRole } from "@iberdrola/shared";
import { Dashboard } from "@/components/dashboard";
import { demoEnabled } from "@/lib/env";
import { demoPanel } from "@/lib/data/demo";
export const dynamic = "force-dynamic";
export default async function Demo({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!demoEnabled()) notFound();
  const { rol } = await searchParams;
  return <Dashboard model={demoPanel(isRole(rol) ? rol : "DIRECTOR")} />;
}
