"use server";
import { requireProfile } from "@/lib/auth";
import { canManage, uuidPattern, validDate } from "@/lib/management-validation";
import { revalidatePath } from "next/cache";
export async function enrollStudent(_: string, form: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!canManage(profile.rol))
    return "Sin permiso para matricular estudiantes.";
  const student = String(form.get("estudiante")),
    course = String(form.get("curso")),
    id = String(form.get("matricula") || ""),
    date = String(form.get("fecha")),
    end = String(form.get("salida") || ""),
    state = String(form.get("estado") || "ACTIVA"),
    version = String(form.get("version") || "");
  if (
    !uuidPattern.test(student) ||
    !uuidPattern.test(course) ||
    (id && !uuidPattern.test(id)) ||
    !validDate(date) ||
    !["ACTIVA", "RETIRADA", "FINALIZADA"].includes(state) ||
    (end && !validDate(end))
  )
    return "Revisa el curso, el estado y las fechas de la matrícula.";
  if (id) {
    const current = await supabase
      .from("matriculas")
      .select("estudiante_id")
      .eq("id", id)
      .maybeSingle();
    if (current.error || current.data?.estudiante_id !== student)
      return "La matrícula no corresponde a este estudiante.";
    if (!version || Number.isNaN(Date.parse(version)))
      return "Recarga la matrícula antes de guardar.";
  }
  const result = await supabase.rpc("guardar_matricula_academica", {
    p_id: id || null,
    p_estudiante: student,
    p_curso: course,
    p_ingreso: date,
    p_salida: end || null,
    p_estado: state,
    p_version: version || null,
  });
  if (result.error)
    return ["23505", "23P01"].includes(result.error.code)
      ? "El estudiante ya tiene una matrícula que se superpone con estas fechas. Revisa su matrícula actual."
      : result.error.code === "40001" ||
          result.error.message?.includes("Otra persona modificó")
        ? "La matrícula cambió. Recarga antes de editar."
        : "No se pudo matricular. Verifica que la fecha pertenezca a la gestión del curso y que no exista una matrícula activa superpuesta.";
  revalidatePath("/panel", "layout");
  return id
    ? "Matrícula actualizada."
    : "Estudiante matriculado correctamente en el curso seleccionado.";
}
export async function assignTeacher(_: string, form: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!canManage(profile.rol)) return "Sin permiso para asignar docentes.";
  const teacher = String(form.get("docente")),
    course = String(form.get("curso")),
    subject = String(form.get("asignatura"));
  if (![teacher, course, subject].every((v) => uuidPattern.test(v)))
    return "Selecciona un curso y una asignatura válidos.";
  const result = await supabase.rpc("guardar_asignacion_academica", {
    p_id: null,
    p_docente: teacher,
    p_curso: course,
    p_asignatura: subject,
    p_activo: true,
    p_version: null,
  });
  if (result.error)
    return result.error.code === "23505"
      ? "Este curso ya tiene un docente asignado a esa materia. Edita la asignación existente."
      : "No se pudo asignar. Comprueba que el docente, curso y asignatura estén activos.";
  revalidatePath("/panel", "layout");
  return "Materia y curso asignados al docente.";
}
