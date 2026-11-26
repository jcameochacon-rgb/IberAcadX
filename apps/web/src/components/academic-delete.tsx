import Link from "next/link";
import { OperationForm } from "./operation-form";
import { CrudTable } from "./crud-table";
import { deleteAcademic } from "@/app/panel/delete-actions";
import type { PanelModel } from "@/lib/data/model";
export function AcademicDelete({
  model,
  tipo,
  selectedId,
}: {
  model: PanelModel;
  tipo: "asistencia" | "calificaciones";
  selectedId?: string;
}) {
  const row = model.listings[tipo].rows.find((r) => r.id === selectedId);
  const base = `/panel/${tipo}/registro`;
  return (
    <section>
      <p className="mb-5 text-sm text-slate-500">
        Solo se pueden eliminar borradores de tu ámbito. Retira la publicación
        desde Editar antes de eliminar.
      </p>
      {row ? (
        <>
          <OperationForm
            action={deleteAcademic}
            label="Confirmar eliminación"
            danger
          >
            <h2 className="text-xl font-semibold">
              {String(row.cells.student || "Registro académico")}
            </h2>
            <p>
              {Object.values(row.cells)
                .filter((v) => v !== null)
                .join(" · ")}
            </p>
            <input type="hidden" name="tipo" value={tipo} />
            <input type="hidden" name="id" value={row.id} />
          </OperationForm>
          <Link
            href={`${base}?accion=eliminar`}
            className="mt-5 inline-block text-blue-700"
          >
            Volver a la selección
          </Link>
        </>
      ) : (
        <CrudTable
          base={base}
          action="eliminar"
          rows={model.listings[tipo].rows.map((r) => ({
            id: r.id,
            name: String(r.cells.student || "Registro"),
            detail: Object.entries(r.cells)
              .filter(([k]) => k !== "student" && k !== "status")
              .map(([, v]) => v ?? "Pendiente")
              .join(" · "),
            status: String(r.cells.status || "Sin estado"),
          }))}
        />
      )}
    </section>
  );
}
