import "server-only";
import { requireProfile } from "@/lib/auth";
import { canRecordGrades, type GradeSheet } from "@/lib/grades-validation";
export async function loadGradeOptions() {
  const { supabase, profile } = await requireProfile();
  if (!canRecordGrades(profile.rol)) return { assignments: [], terms: [] };
  const [assignments, terms] = await Promise.all([
    supabase
      .from("asignaciones_docente")
      .select(
        "id,gestion_id,activo,asignaturas(nombre),cursos(grado_id,paralelo,gestiones(anio))",
      )
      .order("id")
      .limit(501),
    supabase
      .from("trimestres")
      .select("id,gestion_id,numero,estado")
      .order("numero")
      .limit(501),
  ]);
  if (assignments.error || terms.error)
    throw Error("No se pudieron cargar las materias y trimestres.");
  if ((assignments.data?.length || 0) > 500 || (terms.data?.length || 0) > 500)
    throw Error(
      "Se necesita un filtro por gestión para mostrar más de 500 registros.",
    );
  return {
    assignments: (assignments.data || [])
      .filter((a) => a.activo)
      .map((a) => ({
        id: a.id,
        gestion_id: a.gestion_id,
        label: `${a.cursos?.grado_id}° ${a.cursos?.paralelo} · ${a.asignaturas?.nombre} · ${a.cursos?.gestiones?.anio}`,
      })),
    terms: terms.data || [],
  };
}
export async function loadGradeSheet(
  asignacion: string,
  trimestre: string,
  matricula: string | null,
): Promise<{ sheet: GradeSheet | null; error?: string }> {
  const { supabase } = await requireProfile();
  const { data, error } = await supabase.rpc(
    "consultar_registro_calificaciones",
    {
      p_asignacion: asignacion,
      p_trimestre: trimestre,
      p_matricula: matricula,
    },
  );
  if (error)
    return {
      sheet: null,
      error: ["PGRST202", "42883"].includes(error.code)
        ? "Falta instalar 202610090001_registro_calificaciones.sql en Supabase."
        : error.code === "42501"
          ? "Tu cuenta no puede registrar calificaciones en esta materia."
          : "No se pudo cargar el registro. Revisa la materia, el trimestre y la matrícula.",
    };
  return { sheet: data as unknown as GradeSheet };
}
