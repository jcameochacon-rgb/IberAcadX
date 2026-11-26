import "server-only";
import { requireProfile } from "@/lib/auth";
import { reportParams, type Report } from "@/lib/reports";
export async function loadReport(
  params: URLSearchParams,
): Promise<{ report: Report | null; error?: string; status?: number }> {
  const { supabase } = await requireProfile();
  let args;
  try {
    args = reportParams(params);
  } catch (e) {
    return { report: null, error: (e as Error).message, status: 400 };
  }
  const { data, error } = await supabase.rpc("consultar_informe", args);
  if (error)
    return {
      report: null,
      status: error.code === "42501" ? 403 : 400,
      error: ["42883", "PGRST202"].includes(error.code)
        ? "Instala 202610130001_informes.sql en Supabase."
        : error.code === "23514"
          ? error.message
          : error.code === "42501"
            ? "Tu cuenta no tiene acceso a este curso."
            : "No se pudo generar el informe. Comprueba la conexión.",
    };
  return { report: data as unknown as Report };
}
