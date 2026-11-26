import { describe, it, expect } from "vitest";
import {
  titles,
  sections,
  allowedActions,
  workspaceHref,
  moduleAt,
  type WorkspaceModule,
} from "./workspace-navigation";
describe("navegación por rol", () => {
  it("conserva los ocho módulos y agrupa la gestión en cinco acordeones", () => {
    expect(Object.values(titles)).toEqual([
      "Gestión de usuarios",
      "Registro de estudiante",
      "Gestión de docente",
      "Padres y tutores",
      "Accesos de padres y tutores",
      "Personal administrativo",
      "Gestión de Cursos",
      "Asignación de materias",
      "Matrículas",
      "Administración de asignaturas",
      "Control de horarios",
      "Control de asistencia",
      "Gestión de calificaciones",
      "Informes y reportes",
    ]);
    expect(sections).toHaveLength(5);
    expect(sections.flatMap((s) => s.children).sort()).toEqual(
      Object.keys(titles).sort(),
    );
    expect(
      sections.find((section) => section.id === "asignaturas")?.children,
    ).toEqual([
      "asignaturas",
      "horarios",
      "cursos",
      "asignaciones",
      "matriculas",
    ]);
    expect(allowedActions("DIRECTOR", "usuarios")).toHaveLength(4);
    expect(allowedActions("SECRETARIA", "usuarios")).toHaveLength(4);
    expect(allowedActions("SECRETARIA", "personal")).toEqual([]);
    expect(allowedActions("DIRECTOR", "personal")).toEqual([
      "registrar",
      "consultar",
      "editar",
      "eliminar",
    ]);
  });
  it("concede CRUD académico a administración y secretaría", () => {
    for (const m of Object.keys(titles) as WorkspaceModule[])
      for (const r of ["DIRECTOR", "SECRETARIA"] as const)
        expect(allowedActions(r, m)).toEqual(
          m === "personal" && r === "SECRETARIA"
            ? []
            : m === "informes"
              ? ["generar", "consultar", "editar", "eliminar"]
              : ["registrar", "consultar", "editar", "eliminar"],
        );
  });
  it("limita docentes a sus operaciones autorizadas", () => {
    expect(allowedActions("DOCENTE", "usuarios")).toEqual([]);
    expect(allowedActions("DOCENTE", "docentes")).toEqual([]);
    expect(allowedActions("DOCENTE", "cursos")).toEqual([]);
    for (const m of ["estudiantes", "asignaturas", "horarios"] as const)
      expect(allowedActions("DOCENTE", m)).toEqual(["consultar"]);
    for (const m of ["asistencia", "calificaciones"] as const)
      expect(allowedActions("DOCENTE", m)).toEqual([
        "registrar",
        "consultar",
        "editar",
        "eliminar",
      ]);
    expect(allowedActions("DOCENTE", "informes")).toEqual([
      "generar",
      "consultar",
    ]);
  });
  it("estudiantes no pueden administrar cursos", () => {
    expect(allowedActions("PADRE", "cursos")).toEqual([]);
    for (const m of Object.keys(titles) as WorkspaceModule[])
      expect(allowedActions("ESTUDIANTE", m)).toEqual(
        [
          "asignaturas",
          "horarios",
          "asistencia",
          "calificaciones",
          "informes",
        ].includes(m)
          ? ["consultar"]
          : [],
      );
  });
  it("mantiene cada acción dentro de su módulo y una URL diferente", () => {
    for (const m of Object.keys(titles) as WorkspaceModule[]) {
      const links = allowedActions("DIRECTOR", m).map((a) =>
        workspaceHref("DIRECTOR", m, a),
      );
      expect(new Set(links).size).toBe(4);
      for (const link of links) {
        const [path, query] = link.split("?");
        expect(moduleAt(path, new URLSearchParams(query).get("modulo"))).toBe(
          m,
        );
      }
    }
  });
  it("abre formularios nuevos y conserva contexto de la demo", () => {
    expect(workspaceHref("DIRECTOR", "estudiantes", "registrar")).toBe(
      "/panel/usuarios?modulo=estudiantes&accion=registrar&rol=ESTUDIANTE",
    );
    expect(workspaceHref("DIRECTOR", "docentes", "registrar")).toBe(
      "/panel/usuarios?modulo=docentes&accion=registrar&rol=DOCENTE",
    );
    expect(workspaceHref("DIRECTOR", "tutores", "registrar")).toBe(
      "/panel/usuarios?modulo=tutores&accion=registrar&rol=PADRE",
    );
    expect(workspaceHref("DOCENTE", "asistencia", "editar", true)).toBe(
      "/demo/operaciones?modulo=asistencia&accion=editar&rol=DOCENTE",
    );
    expect(workspaceHref("DIRECTOR", "cursos", "registrar")).toBe(
      "/panel/gestion/cursos?accion=registrar&nuevo=1",
    );
    expect(workspaceHref("DIRECTOR", "usuarios", "consultar")).toBe(
      "/panel/usuarios?accion=consultar",
    );
    expect(workspaceHref("DIRECTOR", "usuarios", "registrar")).toBe(
      "/panel/usuarios?accion=registrar",
    );
    expect(workspaceHref("DIRECTOR", "asignaciones", "registrar")).toBe(
      "/panel/gestion/asignaciones?accion=registrar&nuevo=1",
    );
    expect(workspaceHref("DIRECTOR", "matriculas", "registrar")).toBe(
      "/panel/gestion/matriculas?accion=registrar&nuevo=1",
    );
    expect(workspaceHref("DIRECTOR", "familias", "registrar")).toBe(
      "/panel/usuarios?modulo=familias&rol=PADRE&accion=registrar",
    );
    expect(workspaceHref("DIRECTOR", "personal", "editar")).toBe(
      "/panel/usuarios?modulo=personal&rol=SECRETARIA&accion=editar",
    );
  });
});
