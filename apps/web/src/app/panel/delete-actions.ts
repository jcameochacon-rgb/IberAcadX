"use server";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canManage, uuidPattern } from "@/lib/management-validation";
import { revalidatePath } from "next/cache";
export async function deleteRecord(_: string, form: FormData) {
  const { supabase, profile } = await requireProfile();
  const table = String(form.get("table")),
    id = String(form.get("id"));
  if (!uuidPattern.test(id)) return "Registro inválido.";
  if (!canManage(profile.rol)) return "Sin permiso.";
  if (
    ![
      "estudiantes",
      "docentes",
      "tutores",
      "cursos",
      "matriculas",
      "asignaciones_docente",
    ].includes(table)
  )
    return "Operación inválida.";
  const result = await supabase
    .from(table as "estudiantes")
    .delete()
    .eq("id", id)
    .select("id");
  if (result.error)
    return "No se puede eliminar un registro que tiene información relacionada. Conserva el historial y desactívalo cuando corresponda.";
  if (!result.data?.length) return "Registro no disponible.";
  revalidatePath("/panel", "layout");
  redirect(
    `/panel/gestion/${table === "asignaciones_docente" ? "asignaciones" : table}?accion=eliminar&eliminado=1`,
  );
}
export async function deleteAcademic(_: string, form: FormData) {
  const { supabase } = await requireProfile();
  const result = await supabase.rpc("eliminar_registro_academico", {
    p_tipo: String(form.get("tipo")),
    p_id: String(form.get("id")),
  });
  if (result.error)
    return "No se pudo eliminar. Revisa tus permisos y retira la publicación antes de eliminar el registro.";
  revalidatePath("/panel", "layout");
  return "Registro eliminado.";
}
