import { describe, it, expect } from "vitest";
import {
  gradeNumber,
  parseGradeForm,
  canRecordGrades,
} from "./grades-validation";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function form() {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    asignacion: id(1),
    trimestre: id(2),
    matricula: id(3),
    version: "a".repeat(32),
    accion: "guardar",
    extra: "0",
    criterio: id(4),
  }))
    f.set(k, v);
  return f;
}
describe("captura de calificaciones", () => {
  it("distingue cero de pendiente", () => {
    expect(gradeNumber("", 10)).toBeNull();
    expect(gradeNumber("0", 10)).toBe(0);
    expect(parseGradeForm(form()).notas[0].puntaje).toBeNull();
  });
  it("rechaza rangos, notación ambigua y decimales excedidos", () => {
    for (const v of ["-1", "11", "NaN", "Infinity", "1e1", "2,5", "2.555"])
      expect(() => gradeNumber(v, 10)).toThrow();
    expect(gradeNumber("2.55", 10)).toBe(2.55);
  });
  it("exige motivo para puntos extra", () => {
    const f = form();
    f.set("extra", "3");
    expect(() => parseGradeForm(f)).toThrow(/motivo/);
    f.set("motivo", "Participación");
    expect(parseGradeForm(f).extra).toBe(3);
  });
  it("rechaza identidades y actividades duplicadas", () => {
    const f = form();
    f.append("criterio", id(4));
    expect(() => parseGradeForm(f)).toThrow();
    f.delete("criterio");
    f.set("matricula", "no");
    expect(() => parseGradeForm(f)).toThrow();
  });
  it("permite captura administrativa y docente", () => {
    expect(canRecordGrades("DIRECTOR")).toBe(true);
    expect(canRecordGrades("DOCENTE")).toBe(true);
    expect(canRecordGrades("SECRETARIA")).toBe(true);
    for (const r of ["PADRE", "ESTUDIANTE", ""])
      expect(canRecordGrades(r)).toBe(false);
  });
});
