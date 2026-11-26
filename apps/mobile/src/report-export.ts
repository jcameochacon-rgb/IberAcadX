export type MobileReport = {
  type: "iberacad.report.pdf" | "iberacad.report.csv";
  title: string;
  subtitle: string;
  columns: string[];
  rows: string[][];
};

export function parseReportMessage(raw: string): MobileReport | null {
  if (raw.length > 8_000_000) return null;
  try {
    const value = JSON.parse(raw);
    const text = (s: unknown) => typeof s === "string" && s.length <= 1000;
    if (
      !value ||
      !["iberacad.report.pdf", "iberacad.report.csv"].includes(value.type) ||
      !text(value.title) ||
      !text(value.subtitle) ||
      !Array.isArray(value.columns) ||
      !value.columns.length ||
      value.columns.length > 12 ||
      !value.columns.every(text) ||
      !Array.isArray(value.rows) ||
      value.rows.length > 5000 ||
      !value.rows.every(
        (row: unknown) =>
          Array.isArray(row) &&
          row.length === value.columns.length &&
          row.every(text),
      )
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

export function reportHtml(report: MobileReport) {
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    @page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#163253;font-size:10px}
    h1{font-size:22px;color:#155bd4}p{line-height:1.6}table{border-collapse:collapse;width:100%}
    th{background:#edf4ff;text-align:left}th,td{padding:7px;border-bottom:1px solid #dce5f0;overflow-wrap:anywhere}
    tr{break-inside:avoid}thead{display:table-header-group}
    </style></head><body><h1>IberAcad · ${escape(report.title)}</h1><p>${escape(report.subtitle)}</p>
    <table><thead><tr>${report.columns.map((c) => `<th>${escape(c)}</th>`).join("")}</tr></thead>
    <tbody>${report.rows.map((row) => `<tr>${row.map((c) => `<td>${escape(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <p>Informe de consulta. No sustituye una libreta oficial. Solo contiene registros visibles para la cuenta que lo generó.</p></body></html>`;
}

export function reportCsv(report: MobileReport) {
  const cell = (s: string) =>
    '"' +
    (/^[\s\u0000-\u001f]*[=+@-]/.test(s) ? "'" : "") +
    s.replaceAll('"', '""') +
    '"';
  return (
    "\ufeff" +
    [[report.title], [report.subtitle], report.columns, ...report.rows]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
