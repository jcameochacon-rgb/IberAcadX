import { describe, expect, it } from "vitest";
import {
  parseReportMessage,
  reportHtml,
  reportCsv,
  type MobileReport,
} from "../../../mobile/src/report-export";
const report: MobileReport = {
  type: "iberacad.report.pdf",
  title: "Notas",
  subtitle: "Curso A",
  columns: ["Nombre"],
  rows: [["Ana"]],
};
describe("exportación móvil", () => {
  it("acepta informes limitados y rechaza mensajes arbitrarios o filas incompletas", () => {
    expect(parseReportMessage(JSON.stringify(report))).toEqual(report);
    for (const value of [
      null,
      {},
      { ...report, type: "exec" },
      { ...report, rows: [["Ana", "extra"]] },
      { ...report, rows: Array(5001).fill(["x"]) },
      { ...report, columns: [1] },
    ])
      expect(parseReportMessage(JSON.stringify(value))).toBeNull();
  });
  it("escapa texto del informe para evitar HTML ejecutable", () => {
    const html = reportHtml({
      ...report,
      rows: [['<script>alert("x")</script> &']],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });
  it("neutraliza fórmulas en CSV y conserva comillas y saltos", () => {
    const csv = reportCsv({ ...report, rows: [["=1+1"], ['Ana "A"\nB']] });
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"Ana ""A""\nB"');
  });
});
