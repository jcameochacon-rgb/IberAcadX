import { uuidPattern } from "@/lib/management-validation";
export type Report = {
  tipo: "calificaciones" | "asistencia";
  curso: string;
  gestion: number;
  periodo: string;
  generado: string;
  filas: Record<string, string | number | null>[];
};
export const reportColumns = {
  calificaciones: [
    ["nombre", "Estudiante"],
    ["rude", "RUDE"],
    ["materia", "Materia"],
    ["ser", "SER /10"],
    ["saber", "SABER /45"],
    ["hacer", "HACER /40"],
    ["autoevaluacion", "Autoevaluación /5"],
    ["puntos_extra", "Extra"],
    ["nota_final", "Nota final /100"],
    ["situacion", "Situación"],
  ],
  asistencia: [
    ["nombre", "Estudiante"],
    ["rude", "RUDE"],
    ["presentes", "Presentes"],
    ["faltas", "Faltas"],
    ["retrasos", "Retrasos"],
    ["licencias", "Licencias"],
    ["registrados", "Días registrados"],
    ["porcentaje", "Presencia %"],
  ],
};
export function reportParams(params: URLSearchParams) {
  const tipo = params.get("tipo") || "calificaciones",
    curso = params.get("curso") || "",
    trimestre = params.get("trimestre") || "",
    desde = params.get("desde") || "",
    hasta = params.get("hasta") || "";
  if (
    !["calificaciones", "asistencia"].includes(tipo) ||
    !uuidPattern.test(curso)
  )
    throw Error("Selecciona el tipo de informe y un curso válido.");
  if (tipo === "calificaciones" && !uuidPattern.test(trimestre))
    throw Error("Selecciona un trimestre.");
  const validDate = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v;
  if (
    tipo === "asistencia" &&
    (!validDate(desde) || !validDate(hasta) || hasta < desde)
  )
    throw Error(
      "Selecciona fechas válidas, con inicio anterior o igual al fin.",
    );
  return {
    p_tipo: tipo,
    p_curso: curso,
    p_trimestre: tipo === "calificaciones" ? trimestre : null,
    p_desde: tipo === "asistencia" ? desde : null,
    p_hasta: tipo === "asistencia" ? hasta : null,
  };
}
// Una celda textual nunca se interpreta como fórmula al abrir el CSV.
export function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\s\u0000-\u001f]*[=+@-]/.test(s))
    s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function reportCsv(report: Report) {
  const cols = reportColumns[report.tipo];
  const head = [
    "Colegio",
    "Curso",
    "Gestión",
    "Periodo",
    "Generado (UTC)",
    ...cols.map((c) => c[1]),
  ];
  return (
    "\ufeff" +
    [
      head,
      ...report.filas.map((row) => [
        "U.E. Iberdrola A",
        report.curso,
        report.gestion,
        report.periodo,
      new Date(report.generado).toISOString(),
        ...cols.map((c) => row[c[0]]),
      ]),
    ]
      .map((row) => row.map(csvCell).join(";"))
      .join("\r\n") +
    "\r\n"
  );
}
