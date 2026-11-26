import { requireProfile } from "@/lib/auth";
import { canManage } from "@/lib/management-validation";
import { OperationForm } from "./operation-form";
import { assignTeacher } from "@/app/panel/gestion/relations-actions";
export async function TeacherAssignmentPanel({
  teacherId,
}: {
  teacherId: string;
}) {
  const { supabase, profile } = await requireProfile();
  if (!canManage(profile.rol)) return null;
  const [courses, subjects, assignments] = await Promise.all([
    supabase
      .from("cursos")
      .select("id,grado_id,paralelo,gestiones(anio,activo)")
      .eq("activo", true)
      .order("grado_id")
      .limit(501),
    supabase
      .from("asignaturas")
      .select("id,nombre")
      .eq("activo", true)
      .order("nombre")
      .limit(501),
    supabase
      .from("asignaciones_docente")
      .select(
        "id,activo,asignaturas(nombre),cursos(grado_id,paralelo,gestiones(anio))",
      )
      .eq("docente_id", teacherId)
      .order("id"),
  ]);
  if (courses.error || subjects.error || assignments.error)
    return (
      <p role="alert">
        No se pudieron cargar las asignaciones. Recarga la página.
      </p>
    );
  if (courses.data.length > 500 || subjects.data.length > 500)
    return (
      <p>Utiliza el módulo Asignación de materias para filtrar las opciones.</p>
    );
  return (
    <section className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-7">
      <h2 className="text-xl font-semibold">Materias y cursos del docente</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        La asignación habilita el acceso del docente a las planillas de sus
        cursos.
      </p>
      <ul className="my-5 grid gap-3 sm:grid-cols-2">
        {assignments.data.map((a) => (
          <li key={a.id} className="rounded-xl bg-slate-50 p-4 text-sm">
            <strong>{a.asignaturas?.nombre}</strong>
            <p className="mt-2 text-slate-500">
              {a.cursos?.grado_id}° {a.cursos?.paralelo} ·{" "}
              {a.cursos?.gestiones?.anio} · {a.activo ? "Activa" : "Inactiva"}
            </p>
          </li>
        ))}
      </ul>
      {!assignments.data.length && (
        <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Este docente todavía no tiene materias asignadas.
        </p>
      )}
      <OperationForm action={assignTeacher} label="Asignar materia y curso">
        <input type="hidden" name="docente" value={teacherId} />
        <label>
          Curso
          <select required name="curso">
            <option value="">Seleccionar curso</option>
            {courses.data
              .filter((c) => c.gestiones?.activo)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grado_id}° {c.paralelo} · {c.gestiones?.anio}
                </option>
              ))}
          </select>
        </label>
        <label>
          Asignatura
          <select required name="asignatura">
            <option value="">Seleccionar asignatura</option>
            {subjects.data.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </label>
      </OperationForm>
    </section>
  );
}
