import { CrudHeading } from "@/components/crud-heading";
import { notFound } from "next/navigation";
import { readAction, allowedActions } from "@/lib/workspace-navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadPanel } from "@/lib/data/live";
import { loadScheduleCourses, loadScheduleSheet } from "@/lib/data/schedule";
import { canManage, uuidPattern } from "@/lib/management-validation";
import { weekdays } from "@/lib/schedule-validation";
import { PanelShell } from "@/components/panel-shell";
import {
  PeriodForm,
  ScheduleForm,
  RemoveScheduleForm,
} from "@/components/schedule-forms";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireProfile(),
    model = await loadPanel(),
    courses = await loadScheduleCourses(),
    params = await searchParams;
  const mode = readAction(params.accion);
  if (!allowedActions(profile.rol, "horarios").includes(mode)) notFound();
  const course = typeof params.curso === "string" ? params.curso : "",
    id = typeof params.bloque === "string" ? params.bloque : "";
  const result = uuidPattern.test(course)
      ? await loadScheduleSheet(course)
      : null,
    sheet = result?.sheet,
    manage = canManage(profile.rol) && mode !== "consultar";
  const block = sheet?.horarios.find((h) => h.id === id);
  const messages: Record<string, string> = {
    periodo: "Periodo actualizado para todos los cursos de la gestión.",
    bloque: "Bloque guardado. El horario actualizado ya está disponible.",
    retirar:
      "Bloque retirado del horario. La operación quedó registrada en auditoría.",
  };
  return (
    <PanelShell model={model} current="horarios">
      <CrudHeading module="horarios" action={mode} />
      <Card className="mb-6 p-5">
        <form
          method="get"
          action="/panel/horarios/semana"
          className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <input type="hidden" name="accion" value={mode} />
          <div>
            <label htmlFor="schedule-course" className="mb-2 block text-sm">
              Curso
            </label>
            <select
              id="schedule-course"
              name="curso"
              defaultValue={course}
              required
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecciona un curso</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <Button>Cargar horario</Button>
        </form>
        {!courses.length && (
          <p className="mt-3 text-sm text-muted-foreground">
            No hay cursos disponibles para tu cuenta.
          </p>
        )}
      </Card>
      {course && !uuidPattern.test(course) && (
        <p role="alert" className="mb-5 text-sm">
          Selecciona un curso válido.
        </p>
      )}
      {result?.error && (
        <p role="alert" className="mb-5 text-sm text-destructive">
          {result.error}
        </p>
      )}
      {sheet && (
        <>
          <h2 className="mb-4 text-xl font-semibold">
            {sheet.curso.grado_id}° {sheet.curso.paralelo} · {sheet.curso.anio}
          </h2>
          {sheet.bloqueo && (
            <p role="alert" className="mb-5 rounded-lg border p-4 text-sm">
              {sheet.bloqueo}
            </p>
          )}
          {typeof params.resultado === "string" &&
            messages[params.resultado] && (
              <p
                role="status"
                className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"
              >
                {messages[params.resultado]}
              </p>
            )}
          <div className="mb-6 grid gap-3 lg:grid-cols-5">
            {weekdays.map((day, i) => (
              <Card key={day} className="min-w-0 p-4">
                <h3 className="mb-4 border-b pb-3 font-semibold">{day}</h3>
                <ol className="space-y-3">
                  {sheet.periodos.map((p) => {
                    const h = sheet.horarios.find(
                        (h) => h.dia_semana === i + 1 && h.periodo_id === p.id,
                      ),
                      a = sheet.asignaciones.find(
                        (a) => a.id === h?.asignacion_docente_id,
                      );
                    return (
                      <li
                        key={p.id}
                        className={`rounded-lg p-3 ${h ? "bg-secondary" : "bg-muted/50"}`}
                      >
                        <p className="text-xs text-muted-foreground">
                          {p.numero} ·{" "}
                          {p.hora_inicio
                            ? `${p.hora_inicio.slice(0, 5)}–${p.hora_fin?.slice(0, 5)}`
                            : "Hora sin configurar"}
                        </p>
                        <p className="mt-2 break-words text-sm font-medium">
                          {h
                            ? a?.nombre || "Materia no visible para tu rol"
                            : "Sin asignar"}
                        </p>
                        {manage && mode !== "registrar" && h && (
                          <>
                            <p className="mt-1 break-words text-xs text-muted-foreground">
                              {a?.docente}
                              {a && !a.activo ? " · Asignación inactiva" : ""}
                            </p>
                            <Link
                              href={`/panel/horarios/semana?accion=${mode}&curso=${course}&bloque=${h.id}#editar-bloque`}
                              className="mt-3 inline-block text-xs font-semibold text-primary underline"
                              aria-label={`${mode === "eliminar" ? "Eliminar" : "Editar"} ${day} periodo ${p.numero}`}
                            >
                              {mode === "eliminar"
                                ? "Seleccionar para eliminar"
                                : "Editar bloque"}
                            </Link>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </Card>
            ))}
          </div>
          {!sheet.periodos.length && (
            <p className="mb-6 text-sm">
              Esta gestión no tiene periodos. Dirección debe crear sus seis
              periodos antes de configurar horarios.
            </p>
          )}
          {manage && (
            <>
              {mode === "editar" && (
                <Card className="mb-6 p-5">
                  <details>
                    <summary className="cursor-pointer font-semibold">
                      Configurar horas de los periodos
                    </summary>
                    <p className="my-4 text-sm leading-6 text-muted-foreground">
                      Seis periodos de 40 minutos dentro de 14:00–18:05, sin
                      superposición. Las horas son compartidas por todos los
                      cursos de la gestión. Introduce el horario real; no se
                      asignan horas ni recreos automáticamente.
                    </p>
                    <div className="space-y-4">
                      {sheet.periodos.map((p) => (
                        <PeriodForm
                          key={`${p.id}-${p.updated_at}`}
                          period={p}
                          course={course}
                          disabled={!!sheet.bloqueo}
                        />
                      ))}
                    </div>
                  </details>
                </Card>
              )}
              {(mode === "registrar" || block) && (
                <Card id="editar-bloque" className="scroll-mt-5 p-5">
                  <h2 className="mb-5 text-lg font-semibold">
                    {mode === "eliminar"
                      ? "Eliminar bloque"
                      : id
                        ? "Editar bloque"
                        : "Nuevo bloque"}
                  </h2>
                  {id && !block ? (
                    <p role="alert" className="text-sm">
                      El bloque ya no está disponible. Recarga el horario.
                    </p>
                  ) : (
                    <>
                      {mode !== "eliminar" &&
                        (mode === "registrar" || block) && (
                          <ScheduleForm
                            key={`${block?.id || "nuevo"}-${block?.updated_at || ""}-${JSON.stringify(sheet.asignaciones)}-${JSON.stringify(sheet.periodos)}`}
                            sheet={sheet}
                            block={block}
                          />
                        )}
                      {block && mode === "eliminar" && (
                        <RemoveScheduleForm
                          key={`${block.id}-${block.updated_at}`}
                          block={block}
                          course={course}
                        />
                      )}
                    </>
                  )}
                </Card>
              )}
            </>
          )}
          {!manage && (
            <p className="text-xs leading-6 text-muted-foreground">
              Vista de consulta. El horario muestra únicamente los datos
              permitidos para tu cuenta; no se publican en la portada del
              colegio.
            </p>
          )}
        </>
      )}
    </PanelShell>
  );
}
