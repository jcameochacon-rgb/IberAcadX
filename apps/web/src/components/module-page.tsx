import { titles } from "@/lib/workspace-navigation";
import { PanelShell } from "@/components/panel-shell";
import { Card } from "@/components/ui/card";
import { RecordsTable } from "@/components/records-table";
import type { Module } from "@iberdrola/shared";
import type { PanelModel } from "@/lib/data/model";
export function ModulePage({
  model,
  module,
}: {
  model: PanelModel;
  module: Module;
}) {
  const listing = model.listings[module];
  return (
    <PanelShell model={model} current={module}>
      <div className="mb-7">
        <p className="mb-2 text-xs text-muted-foreground">Consulta académica</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {module === "cursos" ? listing.title : titles[module]}
          <span className="text-primary">.</span>
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {listing.description}
        </p>
      </div>
      <Card className="overflow-hidden">
        <RecordsTable listing={listing} />
      </Card>
    </PanelShell>
  );
}
