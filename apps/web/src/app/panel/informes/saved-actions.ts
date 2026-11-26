"use server";
import { requireProfile } from "@/lib/auth";
import { canManage } from "@/lib/management-validation";
import { reportParams } from "@/lib/reports";
import { revalidatePath } from "next/cache";
export async function saveReport(_: string, f: FormData) {
  const { supabase, profile, user } = await requireProfile();
  if (!canManage(profile.rol))
    return "Sin permiso para administrar informes guardados.";
  const id = String(f.get("id") || ""),
    name = String(f.get("nombre") || "").trim(),
    params =
      f.get("campos") === "1"
        ? new URLSearchParams(
            Object.fromEntries(
              ["tipo", "curso", "trimestre", "desde", "hasta"].map((k) => [
                k,
                String(f.get(k) || ""),
              ]),
            ),
          ).toString()
        : String(f.get("parametros") || "");
  let result;
  if (f.get("op") === "delete")
    result = await supabase
      .from("reportes_guardados")
      .delete()
      .eq("id", id)
      .eq("propietario_id", user.id)
      .select("id");
  else {
    if (!name || name.length > 150)
      return "Indica un nombre de hasta 150 caracteres.";
    try {
      reportParams(new URLSearchParams(params));
    } catch {
      return "Selecciona filtros válidos antes de guardar el informe.";
    }
    const values = {
      nombre: name,
      parametros: params,
      updated_at: new Date().toISOString(),
    };
    result = id
      ? await supabase
          .from("reportes_guardados")
          .update(values)
          .eq("id", id)
          .eq("propietario_id", user.id)
          .select("id")
      : await supabase
          .from("reportes_guardados")
          .insert({ ...values, propietario_id: user.id })
          .select("id");
  }
  if (result.error || !result.data?.length)
    return "No se pudo guardar. Verifica que las migraciones estén instaladas.";
  revalidatePath("/panel/informes");
  return "Informe guardado actualizado.";
}
