import { requireProfile } from "@/lib/auth";
import { canManage, localToday } from "@/lib/management-validation";
import { OperationForm } from "./operation-form";
import { enrollStudent } from "@/app/panel/gestion/relations-actions";
export async function EnrolmentPanel({ studentId }: { studentId: string }) {
  const { supabase, profile } = await requireProfile();
  if (!canManage(profile.rol)) return null;
  const [courses, enrolments] = await Promise.all([
    supabase
      .from("cursos")
      .select("id,grado_id,paralelo,activo,gestiones(anio,activo)")
      .order("grado_id")
      .limit(501),
    supabase
      .from("matriculas")
      .select("id,curso_id,estado,fecha_ingreso,fecha_salida,updated_at")
      .eq("estudiante_id", studentId)
      .order("fecha_ingreso", { ascending: false }),
  ]);
  if (courses.error || enrolments.error)
    return (
      <p role="alert">
        No se pudieron cargar las matrículas. Recarga la página.
      </p>
    );
  if (courses.data.length > 500)
    return (
      <p role="alert">
        Utiliza el módulo Matrículas para filtrar entre los cursos disponibles.
      </p>
    );
  const label = (id: string) => {
    const c = courses.data.find((c) => c.id === id);
    return c
      ? `${c.grado_id}° ${c.paralelo} · ${c.gestiones?.anio}`
      : "Curso histórico";
  };
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Curso y matrícula</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          La cuenta permite ingresar; la matrícula vincula al estudiante con sus
          materias, horario, asistencia y calificaciones.
        </p>
      </div>
      {enrolments.data.map((m) => (
        <details
          key={`${m.id}-${m.updated_at}`}
          className="rounded-xl border border-border p-4"
        >
          <summary className="cursor-pointer font-medium">
            {label(m.curso_id)} · {m.estado}
          </summary>
          <div className="mt-4">
            <OperationForm action={enrollStudent} label="Guardar matrícula">
              <input type="hidden" name="matricula" value={m.id} />
              <input type="hidden" name="estudiante" value={studentId} />
              <input type="hidden" name="curso" value={m.curso_id} />
              <input type="hidden" name="version" value={m.updated_at} />
              <label>
                Fecha de ingreso
                <input
                  type="date"
                  name="fecha"
                  required
                  defaultValue={m.fecha_ingreso}
                />
              </label>
              <label>
                Estado
                <select name="estado" defaultValue={m.estado}>
                  <option>ACTIVA</option>
                  <option>RETIRADA</option>
                  <option>FINALIZADA</option>
                </select>
              </label>
              <label>
                Fecha de salida
                <input
                  type="date"
                  name="salida"
                  defaultValue={m.fecha_salida || ""}
                />
              </label>
            </OperationForm>
          </div>
        </details>
      ))}
      {!enrolments.data.length && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Este estudiante todavía no está matriculado en un curso.
        </p>
      )}
      <details
        className="rounded-xl border border-border p-4"
        open={!enrolments.data.length}
      >
        <summary className="cursor-pointer font-semibold text-blue-700">
          Matricular en un curso
        </summary>
        <div className="mt-4">
          <OperationForm action={enrollStudent} label="Matricular estudiante">
            <input type="hidden" name="estudiante" value={studentId} />
            <label>
              Curso y gestión
              <select name="curso" required>
                <option value="">Seleccionar curso</option>
                {courses.data
                  .filter((c) => c.activo && c.gestiones?.activo)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {label(c.id)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Fecha de ingreso
              <input
                type="date"
                name="fecha"
                required
                defaultValue={localToday()}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Para un traslado, primero registra la salida del curso anterior.
              No se permiten fechas superpuestas.
            </p>
          </OperationForm>
        </div>
      </details>
    </section>
  );
}
