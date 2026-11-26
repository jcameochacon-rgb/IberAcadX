import { describe, it, expect } from "vitest";
import { csvCell, reportCsv, reportParams, type Report } from "./reports";
describe("informes", () => {
  it("neutraliza fórmulas y escapa delimitadores, comillas y saltos", () => {
    expect(csvCell(' =HYPERLINK("a")')).toBe('"\' =HYPERLINK(""a"")"');
    expect(csvCell("Apellido; Nombre\nOtro")).toBe('"Apellido; Nombre\nOtro"');
    expect(csvCell(0)).toBe('"0"');
    expect(csvCell(null)).toBe('""');
    for (const x of ["+1", "-1", "@cmd", "\t=1"])
      expect(csvCell(x)).toBe("\"'" + x + '"');
  });
  it("CSV conserva cero, metadatos y UTF-8", () => {
    const r: Report = {
      tipo: "asistencia",
      curso: "1° A",
      gestion: 2026,
      periodo: "Octubre",
      generado: "2026-10-13T08:00:00-04:00",
      filas: [{ nombre: "Muñoz", faltas: 0 }],
    };
    const csv = reportCsv(r);
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain("Muñoz");
    expect(csv).toContain('"0"');
    expect(csv).toContain('"Gestión"');
    expect(csv).toContain("2026-10-13T12:00:00.000Z");
  });
  it("rechaza filtros incompletos y fechas imposibles", () => {
    expect(() => reportParams(new URLSearchParams())).toThrow();
    const p = new URLSearchParams({
      tipo: "asistencia",
      curso: "00000000-0000-4000-8000-000000000001",
      desde: "2026-02-30",
      hasta: "2026-03-01",
    });
    expect(() => reportParams(p)).toThrow();
    p.set("desde", "2026-02-01");
    expect(reportParams(p).p_trimestre).toBeNull();
  });
});
