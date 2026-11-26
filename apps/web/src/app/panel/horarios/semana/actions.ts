"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canManage } from "@/lib/management-validation";
import {
  checkScheduleId,
  scheduleTimes,
  scheduleDay,
  type ScheduleState,
} from "@/lib/schedule-validation";
function errorText(e: { code?: string; message?: string }) {
  if (["42883", "PGRST202"].includes(e.code || ""))
    return "Falta instalar 202610090002_registro_horarios.sql en Supabase.";
  if (e.code === "42501")
    return "Solo Dirección y Secretaría pueden gestionar horarios.";
  if (e.code === "23505")
    return "El curso o el docente ya tiene una clase en ese día y periodo. Elige otro bloque.";
  if (e.code === "23514" || e.message === "Periodos superpuestos")
    return e.message || "Revisa los datos.";
  return "No se pudo guardar. Comprueba la conexión y recarga antes de intentarlo de nuevo.";
}
export async function saveSchedule(
  previous: ScheduleState,
  form: FormData,
): Promise<ScheduleState> {
  const { supabase, profile } = await requireProfile();
  if (!canManage(profile.rol))
    return { error: "Solo Dirección y Secretaría pueden gestionar horarios." };
  const text = (k: string) => String(form.get(k) ?? "");
  let course = "",
    kind = "";
  try {
    course = checkScheduleId(text("curso"));
    kind = text("tipo");
    let result;
    if (kind === "periodo") {
      const times = scheduleTimes(text("inicio"), text("fin"));
      result = await supabase.rpc("guardar_periodo_horario", {
        p_id: checkScheduleId(text("id")),
        p_version: text("version") || null,
        p_inicio: times.start,
        p_fin: times.end,
        p_confirmar: form.get("confirmar") === "on",
      });
    } else if (kind === "retirar") {
      result = await supabase.rpc("retirar_bloque_horario", {
        p_id: checkScheduleId(text("id")),
        p_version: text("version") || null,
        p_confirmar: form.get("confirmar") === "on",
      });
    } else if (kind === "bloque") {
      result = await supabase.rpc("guardar_bloque_horario", {
        p_curso: course,
        p_id: text("id") ? checkScheduleId(text("id")) : null,
        p_version: text("version") || null,
        p_asignacion: checkScheduleId(text("asignacion")),
        p_asignacion_version: text("asignacion_version") || null,
        p_periodo: checkScheduleId(text("periodo")),
        p_periodo_version: text("periodo_version") || null,
        p_dia: scheduleDay(text("dia")),
      });
    } else return { error: "Selecciona una acción válida." };
    if (result.error) return { error: errorText(result.error) };
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "No se pudo conectar. Tus cambios siguen en el formulario.",
    };
  }
  revalidatePath("/panel", "layout");
  redirect(`/panel/horarios/semana?curso=${course}&resultado=${kind}`);
}
