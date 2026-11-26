import "server-only";
import { requireProfile } from "@/lib/auth";
import {
  canRecordAttendance,
  type AttendanceSheet,
} from "@/lib/attendance-validation";
export async function loadAttendanceCourses() {
  const { supabase, profile } = await requireProfile();
  if (!canRecordAttendance(profile.rol)) return [];
  const { data, error } = await supabase
    .from("cursos")
    .select("id,grado_id,paralelo,activo,gestiones(anio,activo)")
    .order("grado_id")
    .order("paralelo")
    .limit(501);
  if (error) throw Error("No se pudieron consultar los cursos de asistencia.");
  if ((data || []).length > 500)
    throw Error(
      "Hay demasiados cursos para esta vista. Se necesita un filtro por gestión.",
    );
  return (data || []).map((c) => ({
    id: c.id,
    label: `${c.grado_id}° ${c.paralelo} · ${c.gestiones?.anio || "—"}${!c.activo || !c.gestiones?.activo ? " · Inactivo" : ""}`,
    year: c.gestiones?.anio || null,
  }));
}
export async function loadAttendanceSheet(
  curso: string,
  fecha: string,
): Promise<{ sheet: AttendanceSheet | null; error?: string }> {
  const { supabase, profile } = await requireProfile();
  if (!canRecordAttendance(profile.rol))
    return { sheet: null, error: "Tu cuenta no puede registrar asistencia." };
  const { data, error } = await supabase.rpc("consultar_asistencia_curso", {
    p_curso: curso,
    p_fecha: fecha,
  });
  if (error) {
    if (["PGRST202", "42883"].includes(error.code))
      return {
        sheet: null,
        error:
          "Falta instalar 202610070001_registro_asistencia.sql en Supabase.",
      };
    if (error.code === "42501")
      return {
        sheet: null,
        error: "Tu cuenta no tiene acceso a la lista de este curso.",
      };
    return {
      sheet: null,
      error:
        "No se pudo cargar la jornada. Comprueba la conexión y vuelve a intentarlo.",
    };
  }
  return { sheet: data as unknown as AttendanceSheet };
}
