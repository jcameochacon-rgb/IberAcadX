import { CrudHeading } from "@/components/crud-heading";
import { readAction } from "@/lib/workspace-navigation";
import { AcademicDelete } from "@/components/academic-delete";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadPanel } from "@/lib/data/live";
import { loadGradeOptions, loadGradeSheet } from "@/lib/data/grades";
import { canRecordGrades, gradeId } from "@/lib/grades-validation";
import { PanelShell } from "@/components/panel-shell";
import { GradeForm, CriterionForm } from "@/components/grade-forms";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
const selectClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-sm";
export default async function GradeRegister({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireProfile(),
    model = await loadPanel();
  if (!canRecordGrades(profile.rol))
    return (
      <PanelShell model={model} current="calificaciones">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold">Acceso restringido</h1>
          <p className="mt-3">
            Dirección y los docentes asignados registran calificaciones.
          </p>
          <Button asChild className="mt-5" variant="outline">
            <Link href="/panel/calificaciones">Ver calificaciones</Link>
          </Button>
        </Card>
      </PanelShell>
    );
  const p = await searchParams;
  const mode = readAction(p.accion, "registrar");
  if (mode === "eliminar")
    return (
      <PanelShell model={model} current="calificaciones">
        <CrudHeading module="calificaciones" action="eliminar" />
        <AcademicDelete
          model={model}
          tipo="calificaciones"
          selectedId={typeof p.id === "string" ? p.id : undefined}
        />
      </PanelShell>
    );
  const text = (k: string) =>
    typeof p[k] === "string" ? (p[k] as string) : "";
  const options = await loadGradeOptions(),
    assignment = options.assignments.find((a) => a.id === text("asignacion"));
  const terms = options.terms.filter(
    (t) => t.gestion_id === assignment?.gestion_id,
  );
  const term =
    terms.find((t) => t.id === text("trimestre")) ||
    (!text("trimestre")
      ? terms.find((t) => t.estado === "ABIERTO") || terms[0]
      : undefined);
  const matricula = text("matricula");
  const result =
    assignment && term && (!matricula || gradeId(matricula))
      ? await loadGradeSheet(assignment.id, term.id, matricula || null)
      : null;
  const sheet = result?.sheet;
  const messages: Record<string, string> = {
    guardar: "Borrador guardado. Aún no es visible para la familia.",
    publicar:
      "Calificación publicada. La familia autorizada ya puede consultarla.",
    despublicar: "Calificación despublicada. Puedes corregir el borrador.",
    actividad: "Actividad actualizada.",
  };
  return (
    <PanelShell model={model} current="calificaciones">
      <CrudHeading module="calificaciones" action={mode} />
      <Card className="mb-5 p-5">
        <form
          method="get"
          action="/panel/calificaciones/registro"
          className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <input type="hidden" name="accion" value={mode} />
          <div>
            <label htmlFor="asignacion" className="mb-2 block text-sm">
              Curso y materia
            </label>
            <select
              id="asignacion"
              name="asignacion"
              className={selectClass}
              defaultValue={assignment?.id || ""}
              required
            >
              <option value="">Selecciona una asignación</option>
              {options.assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <Button>Cargar materia</Button>
        </form>
        {!options.assignments.length && (
          <p className="mt-3 text-sm text-muted-foreground">
            No tienes materias asignadas. Dirección o Secretaría debe registrar
            la asignación docente.
          </p>
        )}
      </Card>
      {assignment && term && (
        <Card className="mb-5 p-5">
          <form
            method="get"
            action="/panel/calificaciones/registro"
            className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <input type="hidden" name="accion" value={mode} />
            <input type="hidden" name="asignacion" value={assignment.id} />
            <div>
              <label htmlFor="trimestre" className="mb-2 block text-sm">
                Trimestre
              </label>
              <select
                id="trimestre"
                name="trimestre"
                className={selectClass}
                defaultValue={term.id}
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    Trimestre {t.numero} · {t.estado}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline">Cargar trimestre</Button>
          </form>
        </Card>
      )}
      {text("asignacion") &&
        (!assignment || !term || (!!matricula && !gradeId(matricula))) && (
          <p role="alert" className="mb-5 text-sm">
            Selecciona una asignación, trimestre y matrícula válidos.
          </p>
        )}
      {result?.error && (
        <p role="alert" className="mb-5 text-sm text-destructive">
          {result.error}
        </p>
      )}
      {sheet && (
        <>
          <h2 className="mb-4 text-lg font-semibold">
            {assignment?.label} · Trimestre {sheet.trimestre.numero}
          </h2>
          {sheet.bloqueo && (
            <p role="alert" className="mb-5 rounded-lg border p-4 text-sm">
              {sheet.bloqueo} Configura sus fechas reales con Dirección antes de
              registrar notas.
            </p>
          )}
          <Card className="mb-5 p-5">
            <details open={sheet.criterios.length === 0}>
              <summary className="cursor-pointer font-semibold">
                Actividades de evaluación ({sheet.criterios.length})
              </summary>
              <p className="my-4 text-sm leading-6 text-muted-foreground">
                SER: 10, SABER: 45, HACER: 40. Todas las actividades de una
                dimensión tienen el mismo peso; su promedio se redondea al
                entero. Se necesita al menos una por dimensión. Cambiar
                actividades afecta a todo el curso.
              </p>
              {sheet.criterios_bloqueados && (
                <p className="mb-4 text-sm">
                  Hay calificaciones publicadas. Debes despublicarlas antes de
                  modificar actividades.
                </p>
              )}
              <div className="space-y-4">
                {sheet.criterios.map((k) => (
                  <CriterionForm
                    key={`${k.id}-${k.updated_at}`}
                    sheet={sheet}
                    criterion={k}
                  />
                ))}
                <CriterionForm key={`nueva-${sheet.version}`} sheet={sheet} />
              </div>
            </details>
          </Card>
          <Card className="mb-5 p-5">
            <form
              method="get"
              action="/panel/calificaciones/registro"
              className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <input type="hidden" name="accion" value={mode} />
              <input
                type="hidden"
                name="asignacion"
                value={sheet.asignacion.id}
              />
              <input
                type="hidden"
                name="trimestre"
                value={sheet.trimestre.id}
              />
              <div>
                <label htmlFor="matricula" className="mb-2 block text-sm">
                  Estudiante
                </label>
                <select
                  id="matricula"
                  name="matricula"
                  className={selectClass}
                  defaultValue={sheet.matricula?.id || ""}
                  required
                >
                  <option value="">Selecciona un estudiante</option>
                  {sheet.alumnos.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.nombre} · {a.estado} · {a.nota_final ?? "Pendiente"}
                    </option>
                  ))}
                </select>
              </div>
              <Button>Cargar estudiante</Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              {sheet.alumnos.length} matrículas con vigencia en el trimestre.
              Incluye retiros y traslados que coincidan con sus fechas.
            </p>
          </Card>
          {sheet.matricula ? (
            <GradeForm
              key={sheet.version}
              sheet={sheet}
              message={messages[text("resultado")]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecciona un estudiante para registrar sus notas.
            </p>
          )}
        </>
      )}
    </PanelShell>
  );
}
