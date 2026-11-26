"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import {
  canRecordGrades,
  gradeId,
  parseGradeForm,
  type GradeState,
} from "@/lib/grades-validation";
function errorText(error: { code?: string; message?: string }) {
  if (["PGRST202", "42883"].includes(error.code || ""))
    return "Falta instalar 202610090001_registro_calificaciones.sql en Supabase.";
  if (error.code === "42501")
    return "Tu cuenta no puede registrar calificaciones en esta materia.";
  if (error.code === "23505")
    return "Ya existe una actividad con esa dimensión y orden. Recarga o elige otro orden.";
  if (
    error.code === "23514" ||
    /publicad|Despublic|trimestre|incompleta/.test(error.message || "")
  )
    return error.message || "Revisa los datos.";
  return "No se pudo guardar. Comprueba la conexión y recarga antes de intentarlo de nuevo.";
}
export async function saveGrade(
  previous: GradeState,
  form: FormData,
): Promise<GradeState> {
  const { supabase, profile } = await requireProfile();
  if (!canRecordGrades(profile.rol))
    return { error: "Tu cuenta no puede registrar calificaciones." };
  let v;
  try {
    v = parseGradeForm(form);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Revisa los datos." };
  }
  try {
    const { error } = await supabase.rpc("guardar_calificacion_estudiante", {
      p_asignacion: v.asignacion,
      p_trimestre: v.trimestre,
      p_matricula: v.matricula,
      p_version: v.version,
      p_notas: v.notas,
      p_autoevaluacion: v.auto,
      p_extra: v.extra,
      p_motivo: v.motivo,
      p_accion: v.accion,
    });
    if (error) return { error: errorText(error) };
  } catch {
    return {
      error: "No se pudo conectar. Tus notas se mantienen en el formulario.",
    };
  }
  revalidatePath("/panel", "layout");
  redirect(
    `/panel/calificaciones/registro?asignacion=${v.asignacion}&trimestre=${v.trimestre}&matricula=${v.matricula}&resultado=${v.accion}`,
  );
}
export async function saveCriterion(
  previous: GradeState,
  form: FormData,
): Promise<GradeState> {
  const { supabase, profile } = await requireProfile();
  if (!canRecordGrades(profile.rol))
    return { error: "Tu cuenta no puede registrar calificaciones." };
  const text = (k: string) => String(form.get(k) ?? "");
  const asignacion = text("asignacion"),
    trimestre = text("trimestre"),
    id = text("id"),
    dimension = text("dimension"),
    nombre = text("nombre").trim(),
    orden = Number(text("orden")),
    eliminar = text("accion") === "eliminar";
  if (
    ![asignacion, trimestre].every(gradeId) ||
    (id && !gradeId(id)) ||
    !["SER", "SABER", "HACER"].includes(dimension) ||
    !nombre ||
    nombre.length > 120 ||
    !Number.isInteger(orden) ||
    orden < 1 ||
    orden > 100
  )
    return { error: "Revisa dimensión, nombre y orden de la actividad." };
  try {
    const { error } = await supabase.rpc("gestionar_criterio_calificacion", {
      p_asignacion: asignacion,
      p_trimestre: trimestre,
      p_criterio: id || null,
      p_version: text("version") || null,
      p_dimension: dimension,
      p_nombre: nombre,
      p_orden: orden,
      p_eliminar: eliminar,
    });
    if (error) return { error: errorText(error) };
  } catch {
    return { error: "No se pudo conectar. Comprueba la conexión." };
  }
  revalidatePath("/panel", "layout");
  const matricula = text("matricula");
  redirect(
    `/panel/calificaciones/registro?asignacion=${asignacion}&trimestre=${trimestre}${gradeId(matricula) ? `&matricula=${matricula}` : ""}&resultado=actividad`,
  );
}
