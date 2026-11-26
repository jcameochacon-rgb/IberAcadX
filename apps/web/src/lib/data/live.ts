import "server-only";
import { requireProfile } from "@/lib/auth";
import { labels, displayDate, gradeTone, type PanelModel } from "./model";
import type { Module } from "@iberdrola/shared";
function assertResult<T extends { error: unknown }>(result: T): T {
  if (result.error)
    throw new Error("No se pudo consultar la información académica.");
  return result;
}
export async function loadPanel(): Promise<PanelModel> {
  const { supabase, profile, name } = await requireProfile();
  const g = assertResult(
    await supabase
      .from("gestiones")
      .select("id,anio")
      .eq("activo", true)
      .order("anio", { ascending: false })
      .limit(1),
  );
  const year = g.data?.[0];
  const empty: PanelModel["listings"] = {
    estudiantes: { ...labels.estudiantes, rows: [], total: 0 },
    cursos: { ...labels.cursos, rows: [], total: 0 },
    calificaciones: { ...labels.calificaciones, rows: [], total: 0 },
    asistencia: { ...labels.asistencia, rows: [], total: 0 },
    horarios: { ...labels.horarios, rows: [], total: 0 },
  };
  if (!year)
    return {
      role: profile.rol,
      name,
      year: null,
      demo: false,
      studentCount: 0,
      courseCount: 0,
      publishedGrades: 0,
      attendanceCount: 0,
      listings: empty,
      terms: [],
    };
  // Cliente con sesión del usuario y clave publicable. Ninguna consulta usa service_role.
  const [
    students,
    courses,
    grades,
    attendance,
    schedules,
    assignments,
    subjects,
    enrolments,
    days,
    periods,
    terms,
    publishedCount,
    attendanceCount,
  ] = await Promise.all([
    supabase
      .from("estudiantes")
      .select(
        "id,rude,activo,personas(nombres,apellido_paterno,apellido_materno)",
        { count: "exact" },
      )
      .eq("activo", true)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("cursos")
      .select("id,grado_id,paralelo,activo,grados(nombre)", { count: "exact" })
      .eq("gestion_id", year.id)
      .eq("activo", true)
      .order("grado_id")
      .limit(100),
    supabase
      .from("v_calificaciones")
      .select(
        "id,matricula_id,asignacion_docente_id,nota_final,situacion,trimestre_id,estado",
        { count: "exact" },
      )
      .eq("gestion_id", year.id)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("asistencias")
      .select("id,matricula_id,jornada_id,estado", { count: "exact" })
      .eq("gestion_id", year.id)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("horarios")
      .select("id,curso_id,asignacion_docente_id,periodo_id,dia_semana", {
        count: "exact",
      })
      .eq("gestion_id", year.id)
      .order("dia_semana")
      .limit(100),
    supabase
      .from("asignaciones_docente")
      .select("id,asignatura_id")
      .eq("gestion_id", year.id)
      .limit(1000),
    supabase.from("asignaturas").select("id,nombre").limit(1000),
    supabase
      .from("matriculas")
      .select("id,estudiante_id")
      .eq("gestion_id", year.id)
      .limit(1000),
    supabase
      .from("jornadas_asistencia")
      .select("id,fecha,estado")
      .eq("gestion_id", year.id)
      .limit(1000),
    supabase
      .from("periodos")
      .select("id,numero,hora_inicio,hora_fin")
      .eq("gestion_id", year.id)
      .limit(6),
    supabase
      .from("trimestres")
      .select("id,numero,estado")
      .eq("gestion_id", year.id)
      .order("numero")
      .limit(3),
    supabase
      .from("calificaciones_trimestrales")
      .select("id", { count: "exact", head: true })
      .eq("gestion_id", year.id)
      .eq("estado", "PUBLICADO"),
    supabase
      .from("asistencias")
      .select("id", { count: "exact", head: true })
      .eq("gestion_id", year.id),
  ]);
  [
    students,
    courses,
    grades,
    attendance,
    schedules,
    assignments,
    subjects,
    enrolments,
    days,
    periods,
    terms,
    publishedCount,
    attendanceCount,
  ].forEach(assertResult);
  const personName = (
    person: NonNullable<typeof students.data>[number]["personas"],
  ) =>
    person
      ? [person.nombres, person.apellido_paterno, person.apellido_materno]
          .filter(Boolean)
          .join(" ")
      : "Ficha no disponible";
  const studentIds = [
    ...new Set((enrolments.data || []).map((m) => m.estudiante_id)),
  ];
  const nameRows = studentIds.length
    ? assertResult(
        await supabase
          .from("estudiantes")
          .select("id,personas(nombres,apellido_paterno,apellido_materno)")
          .in("id", studentIds)
          .limit(1000),
      ).data
    : [];
  const studentNames = new Map(
    nameRows?.map((s) => [s.id, personName(s.personas)]),
  );
  const studentFor = (matricula: string | null) =>
    studentNames.get(
      enrolments.data?.find((m) => m.id === matricula)?.estudiante_id || "",
    ) || "Nombre no disponible";
  const subjectFor = (assignment: string | null) =>
    subjects.data?.find(
      (s) =>
        s.id ===
        assignments.data?.find((a) => a.id === assignment)?.asignatura_id,
    )?.nombre || "Asignatura";
  const courseFor = (id: string) => {
    const c = courses.data?.find((c) => c.id === id);
    return c ? `${c.grado_id}° ${c.paralelo}` : "Curso histórico";
  };
  const listings: PanelModel["listings"] = {
    estudiantes: {
      ...labels.estudiantes,
      total: students.count || 0,
      rows: (students.data || []).map((s) => ({
        id: s.id,
        cells: {
          name: personName(s.personas),
          rude: s.rude,
          status: s.activo ? "Activo" : "Inactivo",
        },
        tone: "success",
      })),
    },
    cursos: {
      ...labels.cursos,
      total: courses.count || 0,
      rows: (courses.data || []).map((c) => ({
        id: c.id,
        cells: {
          course: `${c.grado_id}° ${c.paralelo}`,
          grade: c.grados?.nombre || "",
          status: c.activo ? "Activo" : "Inactivo",
        },
        tone: "success",
      })),
    },
    calificaciones: {
      ...labels.calificaciones,
      total: grades.count || 0,
      rows: (grades.data || []).map((c) => ({
        id: c.id || "",
        cells: {
          student: studentFor(c.matricula_id),
          subject: subjectFor(c.asignacion_docente_id),
          term: `${terms.data?.find((t) => t.id === c.trimestre_id)?.numero || "—"}°`,
          grade: c.nota_final,
          status: c.situacion,
        },
        tone: gradeTone(c.situacion),
      })),
    },
    asistencia: {
      ...labels.asistencia,
      total: attendance.count || 0,
      rows: (attendance.data || []).map((a) => {
        const day = days.data?.find((d) => d.id === a.jornada_id);
        return {
          id: a.id,
          cells: {
            student: studentFor(a.matricula_id),
            date: displayDate(day?.fecha || null),
            state: { A: "Presente", F: "Falta", R: "Retraso", L: "Licencia" }[
              a.estado
            ],
            status: day?.estado || "Jornada histórica",
          },
          tone:
            a.estado === "F"
              ? "danger"
              : a.estado === "A"
                ? "success"
                : "warning",
        };
      }),
    },
    horarios: {
      ...labels.horarios,
      total: schedules.count || 0,
      rows: (schedules.data || []).map((h) => {
        const p = periods.data?.find((p) => p.id === h.periodo_id);
        return {
          id: h.id,
          cells: {
            course: courseFor(h.curso_id),
            day: ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"][
              h.dia_semana
            ],
            period: p?.numero || "—",
            subject: subjectFor(h.asignacion_docente_id),
            time:
              p?.hora_inicio && p.hora_fin
                ? `${p.hora_inicio.slice(0, 5)} – ${p.hora_fin.slice(0, 5)}`
                : "Por configurar",
          },
        };
      }),
    },

  };
  return {
    role: profile.rol,
    name,
    year: year.anio,
    demo: false,
    studentCount: students.count || 0,
    courseCount: courses.count || 0,
    publishedGrades: publishedCount.count || 0,
    attendanceCount: attendanceCount.count || 0,
    listings,

    terms: (terms.data || []).map((t) => ({
      number: t.numero,
      state: t.estado,
    })),
  };
}
export function moduleFor(value: string): Module | null {
  return Object.hasOwn(labels, value) ? (value as Module) : null;
}
