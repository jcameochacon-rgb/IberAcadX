import { describe, it, expect } from "vitest";
import { validEmail, validPassword, safeDestination } from "./auth-validation";
import { parseSupabaseConfig } from "./env";
import { demoPanel } from "./data/demo";
import { roles, isRole, isModule } from "@iberdrola/shared";
describe("Límites de autenticación", () => {
  it("rechaza redirecciones externas y conserva solo destinos permitidos", () => {
    for (const path of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/panel?next=https://evil.example",
      "/auth/confirm",
      null,
    ])
      expect(safeDestination(path)).toBe("/panel");
    expect(safeDestination("/actualizar-clave")).toBe("/actualizar-clave");
  });
  it("valida email y longitud antes de contactar a Auth", () => {
    expect(validEmail("prueba@example.invalid")).toBe(true);
    expect(validEmail("a@b")).toBe(false);
    expect(validEmail("a b@example.invalid")).toBe(false);
    expect(validEmail("a".repeat(255) + "@example.invalid")).toBe(false);
  });
  it("exige confirmación y 12 a 128 caracteres sin recortar contraseñas", () => {
    expect(validPassword("abc", "abc")).toBe(false);
    expect(validPassword("contraseña-segura", "otra")).toBe(false);
    expect(validPassword(" contraseña segura ", " contraseña segura ")).toBe(
      true,
    );
    expect(validPassword("a".repeat(129), "a".repeat(129))).toBe(false);
  });
  it("rechaza claves privilegiadas y URL con usuario/query/path", () => {
    const token = (role: string) =>
      `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
    expect(
      parseSupabaseConfig("https://ejemplo.supabase.co", "sb_secret_x"),
    ).toBeNull();
    expect(
      parseSupabaseConfig("https://ejemplo.supabase.co", token("service_role")),
    ).toBeNull();
    expect(
      parseSupabaseConfig(
        "https://user:pass@ejemplo.supabase.co",
        "sb_publishable_demo",
      ),
    ).toBeNull();
    expect(
      parseSupabaseConfig(
        "https://ejemplo.supabase.co/rest/v1",
        "sb_publishable_demo",
      ),
    ).toBeNull();
    expect(
      parseSupabaseConfig("http://remote.example", "sb_publishable_demo"),
    ).toBeNull();
    expect(
      parseSupabaseConfig("https://ejemplo.supabase.co", token("anon"))?.url,
    ).toBe("https://ejemplo.supabase.co");
    expect(
      parseSupabaseConfig("http://127.0.0.1:54321", "sb_publishable_demo"),
    ).not.toBeNull();
    expect(parseSupabaseConfig("", undefined)).toBeNull();
  });
});
describe("Demostración separada de datos reales", () => {
  it("ofrece los cinco roles con hijos/propio visibles según el ejemplo", () => {
    for (const role of roles) {
      const model = demoPanel(role);
      expect(model.demo).toBe(true);
      expect(model.role).toBe(role);
      expect(model.listings.estudiantes.rows).toHaveLength(model.studentCount);
      expect(model.publishedGrades).toBe(
        model.listings.calificaciones.rows.filter(
          (row) => row.cells.grade !== null,
        ).length,
      );
    }
    expect(demoPanel("PADRE").studentCount).toBe(2);
    expect(demoPanel("ESTUDIANTE").studentCount).toBe(1);
  });
  it("solo permite roles y módulos declarados", () => {
    expect(isRole("ADMIN")).toBe(false);
    expect(isModule("../../perfiles")).toBe(false);
    expect(isModule("calificaciones")).toBe(true);
  });
});
