import { CrudHeading } from "@/components/crud-heading";
import { readAction } from "@/lib/workspace-navigation";
import { AcademicDelete } from "@/components/academic-delete";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import {
  canRecordAttendance,
  isAttendanceDate,
  isAttendanceId,
  todayInLaPaz,
} from "@/lib/attendance-validation";
import {
  loadAttendanceCourses,
  loadAttendanceSheet,
} from "@/lib/data/attendance";
import { loadPanel } from "@/lib/data/live";
import { displayDate } from "@/lib/data/model";
import { PanelShell } from "@/components/panel-shell";
import { AttendanceForm } from "@/components/attendance-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default async function AttendanceRegister({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await requireProfile();
  const model = await loadPanel();
  if (!canRecordAttendance(profile.rol))
    return (
      <PanelShell model={model} current="asistencia">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold">Acceso restringido</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Dirección y los docentes asignados registran asistencia. Tu cuenta
            puede consultar las marcas disponibles en Asistencia.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/panel/asistencia">Ver asistencia</Link>
          </Button>
        </Card>
      </PanelShell>
    );
  const params = await searchParams;
  const mode = readAction(params.accion, "registrar");
  if (mode === "eliminar")
    return (
      <PanelShell model={model} current="asistencia">
        <CrudHeading module="asistencia" action="eliminar" />
        <AcademicDelete
          model={model}
          tipo="asistencia"
          selectedId={typeof params.id === "string" ? params.id : undefined}
        />
      </PanelShell>
    );
  const curso = typeof params.curso === "string" ? params.curso : "";
  const fecha =
    typeof params.fecha === "string" ? params.fecha : todayInLaPaz();
  const courses = await loadAttendanceCourses();
  const result =
    curso && isAttendanceId(curso) && isAttendanceDate(fecha)
      ? await loadAttendanceSheet(curso, fecha)
      : null;
  const selected = courses.find((c) => c.id === curso);
  const messages: Record<string, string> = {
    guardar: "Borrador guardado. Las marcas aún no están publicadas.",
    publicar:
      "Jornada publicada. La familia autorizada ya puede consultar sus marcas.",
    despublicar: "Jornada despublicada. Puedes corregir el borrador.",
  };
  return (
    <PanelShell model={model} current="asistencia">
      <CrudHeading module="asistencia" action={mode} />
      <Card className="mb-6 p-5">
        <form
          action="/panel/asistencia/registro"
          method="get"
          className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]"
        >
          <input type="hidden" name="accion" value={mode} />
          <div className="min-w-0">
            <label
              htmlFor="attendance-course"
              className="mb-2 block text-sm font-medium"
            >
              Curso
            </label>
            <select
              id="attendance-course"
              name="curso"
              defaultValue={curso}
              required
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecciona un curso</option>
              {courses.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="attendance-date"
              className="mb-2 block text-sm font-medium"
            >
              Fecha
            </label>
            <Input
              id="attendance-date"
              name="fecha"
              type="date"
              defaultValue={isAttendanceDate(fecha) ? fecha : todayInLaPaz()}
              required
              max={todayInLaPaz()}
            />
          </div>
          <Button type="submit">Cargar lista</Button>
        </form>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          {courses.length
            ? "Una jornada por curso y fecha, compartida por sus docentes asignados. Guarda tus cambios antes de cargar otra lista."
            : "No tienes cursos disponibles. Dirección o Secretaría debe registrar un curso y asignarlo al docente."}
        </p>
      </Card>
      {curso && (!isAttendanceId(curso) || !isAttendanceDate(fecha)) && (
        <p role="alert" className="mb-5 text-sm">
          Selecciona un curso y una fecha válidos.
        </p>
      )}
      {result?.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 p-4 text-sm"
        >
          {result.error}
        </p>
      )}
      {result?.sheet && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">
              {selected?.label ||
                `${result.sheet.curso.grado_id}° ${result.sheet.curso.paralelo}`}{" "}
              · {displayDate(fecha)}
            </h2>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              {result.sheet.jornada?.estado === "PUBLICADO"
                ? "Publicada"
                : result.sheet.jornada
                  ? "Borrador"
                  : "Sin guardar"}
            </span>
          </div>
          <AttendanceForm
            key={`${curso}-${fecha}-${result.sheet.jornada?.updated_at || "nueva"}-${JSON.stringify(result.sheet.filas)}`}
            sheet={result.sheet}
            fecha={fecha}
            message={
              typeof params.resultado === "string"
                ? messages[params.resultado]
                : undefined
            }
          />
        </>
      )}
    </PanelShell>
  );
}
