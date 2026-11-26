// Datos exclusivamente ficticios. No se conectan a Supabase ni se convierten en cuentas.
import type { Role } from "@iberdrola/shared";
import { labels, gradeTone, type PanelModel } from "./model";
export function demoPanel(role: Role): PanelModel {
  const names = [
    "Lucía Ejemplo",
    "Mateo Ejemplo",
    "Valentina Ejemplo",
    "Daniel Ejemplo",
    "Sofía Ejemplo",
    "Nicolás Ejemplo",
    "Camila Ejemplo",
    "Gabriel Ejemplo",
  ];
  const limit =
    role === "ESTUDIANTE"
      ? 1
      : role === "PADRE"
        ? 2
        : role === "DOCENTE"
          ? 4
          : 8;
  const visible = names.slice(0, limit);
  const grades = visible.map((name, i) => ({
    id: `grade-${i}`,
    cells: {
      student: name,
      subject: i % 2 ? "Matemática" : "Lenguaje",
      term: "1°",
      grade: i === 3 ? null : 82 + i * 2,
      status: i === 3 ? "PENDIENTE" : "APROBADO",
    },
    tone: gradeTone(i === 3 ? "PENDIENTE" : "APROBADO"),
  }));
  const listings: PanelModel["listings"] = {
    estudiantes: {
      ...labels.estudiantes,
      total: limit,
      rows: visible.map((name, i) => ({
        id: `student-${i}`,
        cells: {
          name,
          rude: `DEMO-${String(i + 1).padStart(3, "0")}`,
          status: "Activo",
        },
        tone: "success",
      })),
    },
    cursos: {
      ...labels.cursos,
      total: role === "DIRECTOR" || role === "SECRETARIA" ? 3 : 1,
      rows: (role === "DIRECTOR" || role === "SECRETARIA"
        ? [1, 2, 3]
        : [1]
      ).map((i) => ({
        id: `course-${i}`,
        cells: {
          course: `${i}° A`,
          grade: ["Primero", "Segundo", "Tercero"][i - 1],
          status: "Activo",
        },
        tone: "success",
      })),
    },
    calificaciones: {
      ...labels.calificaciones,
      total: grades.length,
      rows: grades,
    },
    asistencia: {
      ...labels.asistencia,
      total: limit,
      rows: visible.map((name, i) => ({
        id: `attendance-${i}`,
        cells: {
          student: name,
          date: "05 oct 2026",
          state: i === 2 ? "Retraso" : "Presente",
          status: "PUBLICADO",
        },
        tone: i === 2 ? "warning" : "success",
      })),
    },
    horarios: {
      ...labels.horarios,
      total: 4,
      rows: [
        "Lenguaje",
        "Matemática",
        "Ciencias Naturales",
        "Educación Física",
      ].map((subject, i) => ({
        id: `schedule-${i}`,
        cells: {
          course: "1° A",
          day: "Lunes",
          period: i + 1,
          subject,
          time: "Por configurar",
        },
      })),
    },

  };
  return {
    role,
    name:
      role === "ESTUDIANTE"
        ? names[0]
        : role === "PADRE"
          ? "Familia Ejemplo"
          : role === "DOCENTE"
            ? "Docente Ejemplo"
            : "Usuario de demostración",
    year: 2026,
    demo: true,
    studentCount: limit,
    courseCount: listings.cursos.total,
    publishedGrades: grades.filter((g) => g.cells.grade !== null).length,
    attendanceCount: limit,
    listings,
    terms: [
      { number: 1, state: "ABIERTO" },
      { number: 2, state: "PLANIFICADO" },
      { number: 3, state: "PLANIFICADO" },
    ],

  };
}
