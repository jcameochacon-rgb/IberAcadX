import Link from "next/link";
import { loadReport } from "@/lib/data/reports";
import { ReportTable } from "@/components/report-table";
import { PrintReport } from "@/components/print-report";
export default async function PrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams))
    if (typeof v === "string") params.set(k, v);
  const result = await loadReport(params);
  return (
    <main className="report-print mx-auto max-w-7xl bg-white p-6">
      <div className="mb-6 flex flex-wrap items-center gap-5 print:hidden">
        <Link className="text-sm underline" href={`/panel/informes?${params}`}>
          Volver al informe
        </Link>
        {result.report && <PrintReport report={result.report} />}
      </div>
      {result.report ? (
        <ReportTable report={result.report} />
      ) : (
        <p role="alert">{result.error}</p>
      )}
      <style>{`@media print {@page {size: A4 landscape; margin:12mm} body{background:white!important} .report-print{padding:0!important;max-width:none!important} .report-scroll{overflow:visible!important} table{width:100%;table-layout:auto;font-size:9pt!important} th,td{padding:5px!important;overflow-wrap:anywhere} thead{display:table-header-group} tr{break-inside:avoid}}`}</style>
    </main>
  );
}
