import { describe, it, expect } from "vitest";
import {
  canManage,
  formValues,
  validateManagement,
  validDate,
  searchTerm,
} from "./management-validation";
const id = "00000000-0000-4000-8000-000000000001";
const values = (entries: Record<string, string>) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(entries)) form.set(k, v);
  return formValues(form);
};
describe("Gestión académica", () => {
  it("valida reutilización de personas, especialidad y referencias de asignación", () => {
    expect(
      validateManagement(
        "docentes",
        values({
          persona_modo: "existente",
          persona_id: id,
          especialidad: "Primaria",
        }),
      ),
    ).toBeNull();
    expect(
      validateManagement(
        "docentes",
        values({ persona_modo: "existente", persona_id: "ajena" }),
      ),
    ).toContain("existente");
    expect(
      validateManagement(
        "docentes",
        values({
          persona_modo: "nueva",
          nombres: "Prueba",
          especialidad: "x".repeat(201),
        }),
      ),
    ).toContain("200");
    expect(
      validateManagement(
        "asignaciones",
        values({ docente_id: id, curso_id: id, asignatura_id: id }),
      ),
    ).toBeNull();
    expect(
      validateManagement(
        "asignaciones",
        values({ docente_id: id, curso_id: "ajeno", asignatura_id: id }),
      ),
    ).toContain("curso");
  });
  it("autoriza solo los dos roles administrativos", () => {
    expect(canManage("DIRECTOR")).toBe(true);
    expect(canManage("SECRETARIA")).toBe(true);
    for (const role of ["DOCENTE", "PADRE", "ESTUDIANTE"] as const)
      expect(canManage(role)).toBe(false);
  });
  it("valida fechas reales y rechaza nacimientos futuros", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2024-02-29")).toBe(true);
    expect(
      validateManagement(
        "estudiantes",
        values({ nombres: "Prueba", fecha_nacimiento: "2200-01-01" }),
      ),
    ).toContain("no futura");
  });
  it("rechaza datos manipulados y requiere versiones para editar", () => {
    expect(
      validateManagement(
        "estudiantes",
        values({ nombres: "Prueba", id: "otro" }),
      ),
    ).toContain("no es válido");
    expect(
      validateManagement("estudiantes", values({ nombres: "Prueba", id })),
    ).toContain("Recarga");
    expect(
      validateManagement(
        "estudiantes",
        values({ nombres: "Prueba", ci: "a".repeat(41) }),
      ),
    ).toContain("longitud");
  });
  it("valida curso, parentesco y coherencia del cierre de matrícula", () => {
    expect(
      validateManagement(
        "cursos",
        values({ gestion_id: id, grado_id: "7", paralelo: "A" }),
      ),
    ).toContain("grado");
    expect(
      validateManagement(
        "vinculos",
        values({ estudiante_id: id, tutor_id: id, parentesco: "" }),
      ),
    ).toContain("parentesco");
    expect(
      validateManagement(
        "matriculas",
        values({
          estudiante_id: id,
          curso_id: id,
          fecha_ingreso: "2026-02-01",
          estado: "RETIRADA",
        }),
      ),
    ).toContain("salida");
    expect(
      validateManagement(
        "matriculas",
        values({
          estudiante_id: id,
          curso_id: id,
          fecha_ingreso: "2026-02-01",
          fecha_salida: "2026-01-01",
          estado: "RETIRADA",
        }),
      ),
    ).toContain("posterior");
  });
  it("omite campos ajenos, archivos e instrucciones de filtro", () => {
    const form = new FormData();
    form.set("nombres", " Prueba ");
    form.set("rol", "DIRECTOR");
    form.set("ci", new Blob(["archivo"]));
    const v = formValues(form);
    expect(v.nombres).toBe("Prueba");
    expect(v).not.toHaveProperty("rol");
    expect(v.ci).toBe("");
    expect(searchTerm('%,id.eq.x,("')).not.toMatch(/[,%()"\\]/);
  });
});
