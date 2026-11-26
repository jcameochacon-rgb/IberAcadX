import { PrintReport } from "@/components/print-report";
import { CrudHeading } from "@/components/crud-heading";
import { readAction, allowedActions } from "@/lib/workspace-navigation";
import { notFound } from "next/navigation";
import { SavedReports } from "@/components/saved-reports";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadPanel } from "@/lib/data/live";
import { loadScheduleCourses } from "@/lib/data/schedule";
import { loadReport } from "@/lib/data/reports";
import { PanelShell } from "@/components/panel-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportTable } from "@/components/report-table";
const field =
  "mt-2 h-12 w-full rounded-lg border border-input bg-background px-3 text-sm";
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireProfile(),
    model = await loadPanel(),
    courses = await loadScheduleCourses();
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams))
    if (typeof v === "string") params.set(k, v);
  const mode = readAction(params.get("accion"));
  if (!allowedActions(model.role, "informes").includes(mode)) notFound();
  if (mode === "editar" || mode === "eliminar")
    return (
      <PanelShell model={model} current="informes">
        <CrudHeading module="informes" action={mode} />
        <SavedReports
          mode={mode}
          params={params.toString()}
          id={params.get("id") || undefined}
        />
      </PanelShell>
    );
  const terms = await supabase
    .from("trimestres")
    .select("id,numero,gestiones(anio)")
    .order("numero")
    .limit(501);
  const optionsError = !!terms.error || (terms.data?.length || 0) > 500;
  const result = params.has("curso") ? await loadReport(params) : null;
  return (
    <PanelShell model={model} current="informes">
      <CrudHeading module="informes" action={mode} />
      <Card className="mb-6 p-5">
        {optionsError ? (
          <p role="alert">
            No se pudieron cargar los trimestres o se superó el límite de 500
            opciones.
          </p>
        ) : (
          <form
            action="/panel/informes"
            method="get"
            className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="accion" value={mode} />
            <label className="text-sm">
              Tipo de informe
              <select
                name="tipo"
                aria-label="Tipo de informe"
                defaultValue={params.get("tipo") || "calificaciones"}
                className={field}
              >
                <option value="calificaciones">
                  Calificaciones publicadas
                </option>
                <option value="asistencia">Resumen de asistencia</option>
              </select>
            </label>
            <label className="text-sm">
              Curso
              <select
                name="curso"
                aria-label="Curso"
                required
                defaultValue={params.get("curso") || ""}
                className={field}
              >
                <option value="">Selecciona un curso</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Trimestre (calificaciones)
              <select
                name="trimestre"
                aria-label="Trimestre (calificaciones)"
                defaultValue={params.get("trimestre") || ""}
                className={field}
              >
                <option value="">Selecciona un trimestre</option>
                {terms.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    Trimestre {t.numero} · {t.gestiones?.anio}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Desde (asistencia)
              <input
                type="date"
                name="desde"
                defaultValue={params.get("desde") || ""}
                className={field}
              />
            </label>
            <label className="text-sm">
              Hasta (asistencia)
              <input
                type="date"
                name="hasta"
                defaultValue={params.get("hasta") || ""}
                className={field}
              />
            </label>
            <Button>
              {mode === "generar" ? "Generar informe" : "Consultar informe"}
            </Button>
            <p className="text-xs leading-6 text-muted-foreground sm:col-span-2 lg:col-span-3">
              Para calificaciones, elige un trimestre de la misma gestión del
              curso. Para asistencia, indica las fechas dentro del año de la
              gestión. Los otros filtros se ignoran.
            </p>
          </form>
        )}
      </Card>
      {result?.error && (
        <p role="alert" className="mb-5 rounded-lg border p-4 text-sm">
          {result.error}
        </p>
      )}
      {result?.report && (
        <Card className="min-w-0 p-5">
          <div className="mb-6 flex flex-wrap gap-3">
            <PrintReport
              report={result.report}
              csvHref={`/panel/informes/csv?${params}`}
            />
            <Button asChild>
              <Link href={`/panel/informes/imprimir?${params}`}>
                Preparar impresión / PDF
              </Link>
            </Button>
          </div>
          <ReportTable report={result.report} />
          <p className="mt-5 text-xs leading-6 text-muted-foreground">
            En el navegador, el CSV vuelve a consultar los datos. En la app se
            exporta la vista cargada; actualízala antes si hubo cambios. Se
            exportan todas las filas del informe, hasta 5000.
          </p>
        </Card>
      )}
      {!result && (
        <Card className="p-8 text-sm text-muted-foreground">
          Selecciona los filtros para generar tu primer informe. La consulta no
          modifica calificaciones ni asistencia.
        </Card>
      )}
      <SavedReports mode={mode} params={params.toString()} />
    </PanelShell>
  );
}
