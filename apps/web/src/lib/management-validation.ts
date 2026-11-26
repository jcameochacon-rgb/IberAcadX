import type { Role } from "@iberdrola/shared";

export const managementSections = [
  "estudiantes",
  "tutores",
  "cursos",
  "matriculas",
  "docentes",
  "asignaciones",
] as const;
export type ManagementSection = (typeof managementSections)[number];
export type OptionKind =
  | "estudiantes"
  | "tutores"
  | "cursos"
  | "docentes"
  | "personas"
  | "asignaturas";
export const managementSingular: Record<ManagementSection, string> = {
  estudiantes: "estudiante",
  tutores: "tutor",
  cursos: "curso",
  matriculas: "matrícula",
  docentes: "docente",
  asignaciones: "asignación",
};
export const managementNewLabel: Record<ManagementSection, string> = {
  estudiantes: "Nuevo estudiante",
  tutores: "Nuevo tutor",
  cursos: "Nuevo curso",
  matriculas: "Nueva matrícula",
  docentes: "Nuevo docente",
  asignaciones: "Nueva asignación",
};
export const isManagementSection = (
  value: string,
): value is ManagementSection => managementSections.some((s) => s === value);
export const canManage = (role: Role) =>
  role === "DIRECTOR" || role === "SECRETARIA";
export type ManagementState = {
  error?: string;
  values?: Record<string, string>;
  attempt?: number;
};
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function localToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
// PostgREST filter syntax is not accepted as part of a search term.
export const searchTerm = (value: string) =>
  value
    .slice(0, 100)
    .replace(/[,%_()"\\]/g, " ")
    .trim();
const fields = [
  "id",
  "version",
  "persona_version",
  "nombres",
  "apellido_paterno",
  "apellido_materno",
  "ci",
  "telefono",
  "direccion",
  "rude",
  "genero",
  "fecha_nacimiento",
  "activo",
  "gestion_id",
  "grado_id",
  "paralelo",
  "estudiante_id",
  "tutor_id",
  "parentesco",
  "autorizado_consulta",
  "contacto_principal",
  "curso_id",
  "fecha_ingreso",
  "fecha_salida",
  "estado",
  "persona_modo",
  "persona_id",
  "especialidad",
  "docente_id",
  "asignatura_id",
];
export function formValues(form: FormData) {
  return Object.fromEntries(
    fields.map((key) => [
      key,
      typeof form.get(key) === "string" ? String(form.get(key)).trim() : "",
    ]),
  );
}
export function validateManagement(
  kind: ManagementSection | "vinculos",
  v: Record<string, string>,
): string | null {
  if (v.id && !uuidPattern.test(v.id))
    return "El registro seleccionado no es válido.";
  if (v.id && (!v.version || Number.isNaN(Date.parse(v.version))))
    return "Recarga la ficha antes de editarla.";
  if (kind === "docentes" && !v.id && v.persona_modo === "existente") {
    if (!uuidPattern.test(v.persona_id))
      return "Selecciona una ficha personal existente.";
    if (v.especialidad.length > 200)
      return "La especialidad admite hasta 200 caracteres.";
    return null;
  }
  if (kind === "estudiantes" || kind === "tutores" || kind === "docentes") {
    if (kind === "docentes" && !v.id && v.persona_modo !== "nueva")
      return "Selecciona cómo registrar los datos personales.";
    if (kind === "docentes" && v.especialidad.length > 200)
      return "La especialidad admite hasta 200 caracteres.";
    if (!v.nombres || v.nombres.length > 120)
      return "Ingresa nombres de hasta 120 caracteres.";
    if (
      [v.apellido_paterno, v.apellido_materno].some((s) => s.length > 120) ||
      [v.ci, v.telefono, v.rude].some((s) => s.length > 40) ||
      v.direccion.length > 500
    )
      return "Revisa la longitud de los datos personales.";
    if (
      v.id &&
      (!v.persona_version || Number.isNaN(Date.parse(v.persona_version)))
    )
      return "Recarga los datos personales antes de editar.";
    if (kind === "estudiantes") {
      if (v.genero && !["M", "F", "NO_ESPECIFICADO"].includes(v.genero))
        return "Selecciona una opción de género válida.";
      if (
        v.fecha_nacimiento &&
        (!validDate(v.fecha_nacimiento) ||
          v.fecha_nacimiento < "1900-01-01" ||
          v.fecha_nacimiento > localToday())
      )
        return "La fecha de nacimiento debe ser válida y no futura.";
    }
  } else if (kind === "cursos") {
    if (
      !uuidPattern.test(v.gestion_id) ||
      !/^[1-6]$/.test(v.grado_id) ||
      !/^[A-Z]{1,2}$/.test(v.paralelo.toUpperCase())
    )
      return "Selecciona gestión, grado y un paralelo de una o dos letras.";
  } else if (kind === "asignaciones") {
    if (
      !uuidPattern.test(v.docente_id) ||
      !uuidPattern.test(v.curso_id) ||
      !uuidPattern.test(v.asignatura_id)
    )
      return "Selecciona docente, curso y materia.";
  } else if (kind === "vinculos") {
    if (
      !uuidPattern.test(v.estudiante_id) ||
      !uuidPattern.test(v.tutor_id) ||
      !v.parentesco ||
      v.parentesco.length > 80
    )
      return "Selecciona estudiante, tutor y parentesco.";
  } else {
    if (
      !uuidPattern.test(v.estudiante_id) ||
      !uuidPattern.test(v.curso_id) ||
      !validDate(v.fecha_ingreso)
    )
      return "Selecciona estudiante, curso y una fecha de ingreso válida.";
    if (!["ACTIVA", "RETIRADA", "FINALIZADA"].includes(v.estado))
      return "Selecciona un estado de matrícula válido.";
    if (
      v.fecha_salida &&
      (!validDate(v.fecha_salida) || v.fecha_salida < v.fecha_ingreso)
    )
      return "La salida debe ser igual o posterior al ingreso.";
    if (v.estado !== "ACTIVA" && !v.fecha_salida)
      return "Indica la fecha de salida para cerrar la matrícula.";
    if (v.estado === "ACTIVA" && v.fecha_salida)
      return "Una matrícula activa debe conservar la salida vacía.";
  }
  return null;
}
