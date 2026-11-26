import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { loadPanel } from "@/lib/data/live";
import { PanelShell } from "@/components/panel-shell";
import { OperationForm } from "@/components/operation-form";
import { CrudTable } from "@/components/crud-table";
import { CrudHeading } from "@/components/crud-heading";
import { subjectAction } from "./actions";
import { canManage } from "@/lib/management-validation";
import { allowedActions, readAction } from "@/lib/workspace-navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase, profile } = await requireProfile(),
    params = await searchParams,
    action = readAction(params.accion);
  if (!allowedActions(profile.rol, "asignaturas").includes(action)) notFound();
  const admin = canManage(profile.rol);
  const assigned = await supabase
    .from("asignaciones_docente")
    .select("asignatura_id")
    .eq("activo", true);
  if (assigned.error) throw Error("No se pudieron consultar las asignaciones.");
  let query = supabase.from("asignaturas").select("*").order("nombre");
  if (!admin)
    query = query.in(
      "id",
      assigned.data.map((a) => a.asignatura_id),
    );
  const { data, error } = await query;
  if (error) throw Error("No se pudieron consultar las asignaturas.");
  const selected = data.find((s) => s.id === params.id);
  return (
    <PanelShell model={await loadPanel()}>
      <CrudHeading module="asignaturas" action={action} />
      {action === "registrar" || (selected && action === "editar") ? (
        <OperationForm
          action={subjectAction}
          label={selected ? "Guardar cambios" : "Registrar asignatura"}
        >
          {selected && (
            <>
              <input type="hidden" name="id" value={selected.id} />
              <input type="hidden" name="version" value={selected.updated_at} />
            </>
          )}
          <label>
            Nombre
            <input
              required
              name="nombre"
              maxLength={150}
              defaultValue={selected?.nombre}
            />
          </label>
          <label>
            Descripción
            <textarea
              rows={4}
              name="descripcion"
              defaultValue={selected?.descripcion || ""}
            />
          </label>
          {selected && (
            <label>
              <input
                type="checkbox"
                name="activo"
                defaultChecked={selected.activo}
              />{" "}
              Asignatura activa
            </label>
          )}
        </OperationForm>
      ) : selected && action === "eliminar" ? (
        <OperationForm
          action={subjectAction}
          danger
          label="Confirmar eliminación"
        >
          <h2 className="text-xl font-semibold">{selected.nombre}</h2>
          <p>Solo se puede eliminar si no tiene asignaciones relacionadas.</p>
          <input type="hidden" name="id" value={selected.id} />
          <input type="hidden" name="op" value="delete" />
        </OperationForm>
      ) : (
        <CrudTable
          action={action}
          base="/panel/asignaturas"
          rows={data.map((s) => ({
            id: s.id,
            name: s.nombre,
            detail: s.descripcion || "Sin descripción",
            status: s.activo ? "Activa" : "Inactiva",
          }))}
        />
      )}
      {selected && action !== "consultar" && (
        <Link
          className="mt-5 inline-block text-blue-700"
          href={`/panel/asignaturas?accion=${action}`}
        >
          Volver a la selección
        </Link>
      )}
    </PanelShell>
  );
}
