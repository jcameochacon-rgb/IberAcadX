import type { Role } from "@iberdrola/shared";
export type Action =
  "registrar" | "consultar" | "editar" | "eliminar" | "generar";
export type WorkspaceModule =
  | "usuarios"
  | "estudiantes"
  | "docentes"
  | "tutores"
  | "familias"
  | "personal"
  | "cursos"
  | "asignaciones"
  | "matriculas"
  | "asignaturas"
  | "horarios"
  | "asistencia"
  | "calificaciones"
  | "informes";
export const titles: Record<WorkspaceModule, string> = {
  usuarios: "Gestión de usuarios",
  estudiantes: "Registro de estudiante",
  docentes: "Gestión de docente",
  tutores: "Padres y tutores",
  familias: "Accesos de padres y tutores",
  personal: "Personal administrativo",
  cursos: "Gestión de Cursos",
  asignaciones: "Asignación de materias",
  matriculas: "Matrículas",
  asignaturas: "Administración de asignaturas",
  horarios: "Control de horarios",
  asistencia: "Control de asistencia",
  calificaciones: "Gestión de calificaciones",
  informes: "Informes y reportes",
};
export const sections: { id: WorkspaceModule; children: WorkspaceModule[] }[] =
  [
    {
      id: "usuarios",
      children: [
        "usuarios",
        "estudiantes",
        "docentes",
        "tutores",
        "familias",
        "personal",
      ],
    },
    {
      id: "asignaturas",
      children: [
        "asignaturas",
        "horarios",
        "cursos",
        "asignaciones",
        "matriculas",
      ],
    },
    { id: "asistencia", children: ["asistencia"] },
    { id: "calificaciones", children: ["calificaciones"] },
    { id: "informes", children: ["informes"] },
  ];
export function allowedActions(role: Role, module: WorkspaceModule): Action[] {
  const admin = role === "DIRECTOR" || role === "SECRETARIA";
  if (admin) {
    if (module === "personal" && role !== "DIRECTOR") return [];
    return module === "informes"
      ? ["generar", "consultar", "editar", "eliminar"]
      : ["registrar", "consultar", "editar", "eliminar"];
  }
  if (role === "DOCENTE") {
    if (["estudiantes", "asignaturas", "horarios"].includes(module))
      return ["consultar"];
    if (["asistencia", "calificaciones"].includes(module))
      return ["registrar", "consultar", "editar", "eliminar"];
    if (module === "informes") return ["generar", "consultar"];
    return [];
  }
  return [
    "asignaturas",
    "horarios",
    "asistencia",
    "calificaciones",
    "informes",
  ].includes(module) ||
    (role === "PADRE" && module === "estudiantes")
    ? ["consultar"]
    : [];
}
export function actionLabel(module: WorkspaceModule, action: Action) {
  const verb = {
    registrar: "Registrar",
    consultar: "Consultar",
    editar: "Editar",
    eliminar: "Eliminar",
    generar: "Generar",
  }[action];
  if (module === "informes")
    return {
      generar: "Generar informe/reporte",
      consultar: "Consultar informes/reportes",
      editar: "Editar parámetros",
      eliminar: "Eliminar reporte",
      registrar: "Generar informe/reporte",
    }[action];
  if (module === "matriculas")
    return {
      registrar: "Matricular estudiante",
      consultar: "Consultar matrículas",
      editar: "Editar matrícula",
      eliminar: "Eliminar matrícula",
      generar: "Matricular estudiante",
    }[action];
  return module === "asistencia"
    ? `${verb} asistencia`
    : module === "calificaciones"
      ? `${verb} calificaciones`
      : verb;
}
export function workspaceHref(
  role: Role,
  module: WorkspaceModule,
  action: Action,
  demo = false,
) {
  if (demo)
    return `/demo/operaciones?modulo=${module}&accion=${action}&rol=${role}`;
  let base = "/panel";
  switch (module) {
    case "usuarios":
      base += "/usuarios";
      break;
    case "estudiantes":
      if (action === "registrar")
        return "/panel/usuarios?modulo=estudiantes&accion=registrar&rol=ESTUDIANTE";
      base +=
        role === "DIRECTOR" || role === "SECRETARIA"
          ? "/gestion/estudiantes"
          : "/estudiantes";
      break;
    case "docentes":
      if (action === "registrar")
        return "/panel/usuarios?modulo=docentes&accion=registrar&rol=DOCENTE";
      base += "/gestion/docentes";
      break;
    case "tutores":
      if (action === "registrar")
        return "/panel/usuarios?modulo=tutores&accion=registrar&rol=PADRE";
      base += "/gestion/tutores";
      break;
    case "familias":
    case "personal":
      return `/panel/usuarios?modulo=${module}&rol=${module === "familias" ? "PADRE" : "SECRETARIA"}&accion=${action}`;
    case "cursos":
      base += "/gestion/cursos";
      break;
    case "asignaciones":
      base += "/gestion/asignaciones";
      break;
    case "matriculas":
      base += "/gestion/matriculas";
      break;
    case "asignaturas":
      base += "/asignaturas";
      break;
    case "horarios":
      base += "/horarios/semana";
      break;
    case "asistencia":
    case "calificaciones":
      base += `/${module}${action === "consultar" ? "" : "/registro"}`;
      break;
    case "informes":
      base += "/informes";
  }
  return `${base}?accion=${action}${action === "registrar" && ["estudiantes", "docentes", "tutores", "cursos", "asignaciones", "matriculas"].includes(module) ? "&nuevo=1" : ""}`;
}
export function moduleAt(
  path: string,
  requested?: string | null,
): WorkspaceModule | null {
  if (requested && Object.hasOwn(titles, requested))
    return requested as WorkspaceModule;
  for (const key of Object.keys(titles) as WorkspaceModule[])
    if (path.split("/").includes(key)) return key;
  return null;
}
export function readAction(
  value: unknown,
  fallback: Action = "consultar",
): Action {
  return typeof value === "string" &&
    ["registrar", "consultar", "editar", "eliminar", "generar"].includes(value)
    ? (value as Action)
    : fallback;
}
