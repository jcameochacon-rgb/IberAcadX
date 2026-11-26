"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import {
  canRecordAttendance,
  parseAttendanceForm,
  type AttendanceState,
} from "@/lib/attendance-validation";
function attendanceError(error: { code?: string; message?: string }) {
  if (["PGRST202", "42883"].includes(error.code || ""))
    return "Falta instalar 202610070001_registro_asistencia.sql en Supabase.";
  if (error.code === "42501")
    return "Tu cuenta no tiene permiso para guardar esta jornada.";
  if (error.code === "23505")
    return "Otra persona creó la jornada. Recarga antes de guardar.";
  const known = [
    "Otra persona modificó",
    "La lista de matrículas cambió",
    "La matrícula cambió",
    "La jornada cambió",
    "Despublica la jornada",
    "La fecha necesita",
    "La fecha debe",
    "No se puede registrar",
    "Selecciona un curso",
    "Revisa",
    "La lista debe",
    "Completar asistencia",
    "Asistencia de trimestre cerrado",
    "No hay estudiantes",
    "La jornada ya tiene",
  ];
  if (known.some((p) => error.message?.startsWith(p))) return error.message!;
  return "No se pudo guardar. Revisa los datos y comprueba la conexión.";
}
export async function saveAttendance(
  previous: AttendanceState,
  form: FormData,
): Promise<AttendanceState> {
  const { supabase, profile } = await requireProfile();
  if (!canRecordAttendance(profile.rol))
    return {
      error:
        "Solo Dirección y los docentes asignados pueden registrar asistencia.",
    };
  let values;
  try {
    values = parseAttendanceForm(form);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Revisa la lista de asistencia.",
    };
  }
  let result;
  try {
    result =
      values.intent === "guardar"
        ? await supabase.rpc("guardar_asistencia_curso", {
            p_curso: values.curso,
            p_fecha: values.fecha,
            p_jornada: values.jornada || null,
            p_version: values.version || null,
            p_filas: values.filas,
            p_observacion: values.observacion,
          })
        : await supabase.rpc("cambiar_publicacion_asistencia", {
            p_jornada: values.jornada,
            p_version: values.version,
            p_publicar: values.intent === "publicar",
          });
  } catch {
    return {
      error: "No se pudo conectar. Tus marcas se mantienen en el formulario.",
    };
  }
  if (result.error) return { error: attendanceError(result.error) };
  revalidatePath("/panel", "layout");
  redirect(
    `/panel/asistencia/registro?curso=${values.curso}&fecha=${values.fecha}&resultado=${values.intent}`,
  );
}
