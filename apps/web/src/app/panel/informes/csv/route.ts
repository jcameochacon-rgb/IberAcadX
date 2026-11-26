import { loadReport } from "@/lib/data/reports";
import { reportCsv } from "@/lib/reports";
export async function GET(request: Request) {
  const result = await loadReport(new URL(request.url).searchParams);
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (!result.report)
    return new Response(result.error, {
      status: result.status || 400,
      headers,
    });
  return new Response(reportCsv(result.report), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="iberdrola-${result.report.tipo}-${result.report.gestion}.csv"`,
    },
  });
}
