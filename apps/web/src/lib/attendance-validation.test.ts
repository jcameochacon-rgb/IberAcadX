import { describe, it, expect } from "vitest";
import {
  canRecordAttendance,
  isAttendanceDate,
  parseAttendanceForm,
  todayInLaPaz,
} from "./attendance-validation";
const id = "00000000-0000-4000-8000-000000000001";
const stamp = "2026-03-16T14:00:00.123456+00:00";
const row = {
  matricula_id: id,
  matricula_version: stamp,
  estado: null,
  observacion: "",
  asistencia_version: null,
};
function form(rows: unknown = [row]) {
  const f = new FormData();
  f.set("curso", id);
  f.set("fecha", "2026-03-16");
  f.set("jornada", "");
  f.set("version", "");
  f.set("intent", "guardar");
  f.set("filas", JSON.stringify(rows));
  return f;
}
describe("registro de asistencia", () => {
  it("permite captura administrativa y docente", () => {
    expect(canRecordAttendance("DIRECTOR")).toBe(true);
    expect(canRecordAttendance("DOCENTE")).toBe(true);
    expect(canRecordAttendance("SECRETARIA")).toBe(true);
    for (const r of ["PADRE", "ESTUDIANTE"] as const)
      expect(canRecordAttendance(r)).toBe(false);
  });
  it("rechaza fechas inexistentes", () => {
    expect(isAttendanceDate("2026-02-30")).toBe(false);
    expect(isAttendanceDate("2028-02-29")).toBe(true);
    expect(isAttendanceDate("2026-3-16")).toBe(false);
  });
  it("usa el día de La Paz en el límite UTC", () => {
    expect(todayInLaPaz(new Date("2026-10-07T02:00:00Z"))).toBe("2026-10-06");
  });
  it("conserva marca pendiente y precisión de versión sin aceptar campos extra", () => {
    const f = form([{ ...row, rol: "DIRECTOR" }]);
    const r = parseAttendanceForm(f);
    expect(r.filas[0]).toEqual(row);
  });
  it("rechaza matrículas duplicadas o listas vacías", () => {
    expect(() => parseAttendanceForm(form([row, row]))).toThrow(/matrículas/);
    expect(() => parseAttendanceForm(form([]))).toThrow(/entre 1 y 500/);
  });
  it("valida marcas y observaciones", () => {
    expect(() =>
      parseAttendanceForm(
        form([{ ...row, observacion: "No perder esta nota" }]),
      ),
    ).toThrow(/Selecciona una marca/);
    expect(() => parseAttendanceForm(form([{ ...row, estado: "P" }]))).toThrow(
      /marca válida/,
    );
    expect(() =>
      parseAttendanceForm(form([{ ...row, observacion: "a".repeat(501) }])),
    ).toThrow(/500/);
  });
  it("exige jornada guardada y versión para publicar", () => {
    const f = form();
    f.set("intent", "publicar");
    expect(() => parseAttendanceForm(f)).toThrow(/borrador/);
    f.set("jornada", id);
    f.set("version", stamp);
    expect(parseAttendanceForm(f).intent).toBe("publicar");
  });
  it("rechaza versiones malformadas y payload inválido", () => {
    expect(() =>
      parseAttendanceForm(form([{ ...row, matricula_version: "ayer" }])),
    ).toThrow(/recarga/);
    const f = form();
    f.set("filas", "invalid");
    expect(() => parseAttendanceForm(f)).toThrow(/lista/);
  });
});
