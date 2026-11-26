import type { Role, Module } from "@iberdrola/shared";
export type TableColumn = { key: string; label: string };
export type TableRow = {
  id: string;
  cells: Record<string, string | number | null>;
  tone?: "success" | "warning" | "danger";
};
export type Listing = {
  title: string;
  description: string;
  columns: TableColumn[];
  rows: TableRow[];
  total: number;
};
export type PanelModel = {
  role: Role;
  name: string;
  year: number | null;
  demo: boolean;
  studentCount: number;
  courseCount: number;
  publishedGrades: number;
  attendanceCount: number;
  listings: Record<Module, Listing>;
  terms: { number: number; state: string }[];
};
export function displayDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-BO", {
        timeZone: "America/La_Paz",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(
        new Date(value.length === 10 ? `${value}T12:00:00-04:00` : value),
      )
    : "Sin fecha";
}
export const gradeTone = (state: string | null): TableRow["tone"] =>
  state === "APROBADO"
    ? "success"
    : state === "REPROBADO"
      ? "danger"
      : "warning";
export const labels = {
  estudiantes: {
    title: "Estudiantes",
    description: "Fichas de los estudiantes que puedes consultar.",
    columns: [
      { key: "name", label: "Estudiante" },
      { key: "rude", label: "RUDE" },
      { key: "status", label: "Estado" },
    ],
  },
  cursos: {
    title: "Cursos",
    description: "Cursos y paralelos de la gestión seleccionada.",
    columns: [
      { key: "course", label: "Curso" },
      { key: "grade", label: "Año de escolaridad" },
      { key: "status", label: "Estado" },
    ],
  },
  calificaciones: {
    title: "Calificaciones",
    description:
      "Notas trimestrales disponibles para tu rol. Los registros pendientes conservan su estado.",
    columns: [
      { key: "student", label: "Estudiante" },
      { key: "subject", label: "Asignatura" },
      { key: "term", label: "Trimestre" },
      { key: "grade", label: "Nota final" },
      { key: "status", label: "Situación" },
    ],
  },
  asistencia: {
    title: "Asistencia",
    description:
      "Registros diarios publicados y borradores visibles para tu rol.",
    columns: [
      { key: "student", label: "Estudiante" },
      { key: "date", label: "Fecha" },
      { key: "state", label: "Marca" },
      { key: "status", label: "Jornada" },
    ],
  },
  horarios: {
    title: "Horarios",
    description: "Distribución de materias por curso, día y periodo.",
    columns: [
      { key: "course", label: "Curso" },
      { key: "day", label: "Día" },
      { key: "period", label: "Periodo" },
      { key: "subject", label: "Asignatura" },
      { key: "time", label: "Hora" },
    ],
  },

} satisfies Record<Module, Omit<Listing, "rows" | "total">>;
