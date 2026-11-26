import { Dashboard } from "@/components/dashboard";
import { loadPanel } from "@/lib/data/live";
export default async function Panel() {
  return <Dashboard model={await loadPanel()} />;
}
