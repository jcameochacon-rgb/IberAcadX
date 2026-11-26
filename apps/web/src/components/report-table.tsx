import { reportColumns, type Report } from "@/lib/reports";
export function ReportTable({ report }: { report: Report }) {
  const cols = reportColumns[report.tipo];
  return (
    <>
      <h2 className="text-xl font-semibold">
        {report.tipo === "calificaciones"
          ? "Calificaciones publicadas"
          : "Resumen de asistencia"}
      </h2>
      <p className="mt-2 text-sm">
        U.E. Iberdrola A · {report.curso} · Gestión {report.gestion} ·{" "}
        {report.periodo}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Generado:{" "}
        {new Date(report.generado).toLocaleString("es-BO", {
          timeZone: "America/La_Paz",
        })}{" "}
        (Bolivia). {report.filas.length} filas según los permisos de tu cuenta.
      </p>
      <p className="my-4 text-xs leading-6 text-muted-foreground">
        {report.tipo === "asistencia"
          ? "Presencia = (presentes + retrasos) / días con marca publicada × 100. Los días sin registro no cuentan como faltas."
          : "Incluye solo calificaciones publicadas. Un resultado vacío no significa nota cero. La nota final conserva el cálculo del sistema y su tope de 100."}{" "}
        Informe de consulta; no sustituye una libreta oficial.
      </p>
      {report.filas.length ? (
        <div className="report-scroll overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                {cols.map(([key, label]) => (
                  <th
                    key={key}
                    className="border-b bg-muted px-3 py-3 font-semibold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.filas.map((row, i) => (
                <tr key={i}>
                  {cols.map(([key]) => (
                    <td key={key} className="border-b px-3 py-3">
                      {row[key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg bg-muted p-5 text-sm">
          No hay registros publicados visibles para los filtros seleccionados.
        </p>
      )}
    </>
  );
}
