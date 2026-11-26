import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { canManage } from "@/lib/management-validation";
import { OperationForm } from "./operation-form";
import { CrudTable } from "./crud-table";
import { saveReport } from "@/app/panel/informes/saved-actions";
import type { Action } from "@/lib/workspace-navigation";
export async function SavedReports({
  params,
  mode = "consultar",
  id,
}: {
  params: string;
  mode?: Action;
  id?: string;
}) {
  const { supabase, profile } = await requireProfile();
  if (!canManage(profile.rol)) return null;
  const { data, error } = await supabase
    .from("reportes_guardados")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error)
    return (
      <p className="operation-feedback">
        Instala la actualización de base de datos para habilitar los informes
        guardados.
      </p>
    );
  const selected = data.find((r) => r.id === id);
  const query = new URLSearchParams(selected?.parametros || params);
  const [courses, terms] = await Promise.all([
    supabase
      .from("cursos")
      .select("id,grado_id,paralelo,gestiones(anio)")
      .order("grado_id"),
    supabase
      .from("trimestres")
      .select("id,numero,gestion_id,gestiones(anio)")
      .order("numero"),
  ]);
  return (
    <section className="mt-6">
      <h2 className="mb-4 text-xl font-semibold">Informes guardados</h2>
      {mode === "generar" && params.includes("curso=") && (
        <OperationForm action={saveReport} label="Guardar informe actual">
          <input type="hidden" name="parametros" value={params} />
          <label>
            Nombre
            <input name="nombre" required maxLength={150} />
          </label>
        </OperationForm>
      )}
      {selected && mode === "eliminar" ? (
        <OperationForm action={saveReport} danger label="Confirmar eliminación">
          <h3 className="text-lg font-semibold">{selected.nombre}</h3>
          <p>
            Se elimina este informe guardado. Las calificaciones y asistencias
            de origen se conservan.
          </p>
          <input type="hidden" name="id" value={selected.id} />
          <input type="hidden" name="op" value="delete" />
        </OperationForm>
      ) : selected && mode === "editar" ? (
        <OperationForm action={saveReport} label="Guardar parámetros">
          <input type="hidden" name="id" value={selected.id} />
          <input type="hidden" name="campos" value="1" />
          <label>
            Nombre
            <input
              name="nombre"
              defaultValue={selected.nombre}
              required
              maxLength={150}
            />
          </label>
          <label>
            Tipo
            <select
              name="tipo"
              defaultValue={query.get("tipo") || "calificaciones"}
            >
              <option value="calificaciones">Calificaciones</option>
              <option value="asistencia">Asistencia</option>
            </select>
          </label>
          <label>
            Curso
            <select
              name="curso"
              defaultValue={query.get("curso") || ""}
              required
            >
              <option value="">Seleccionar curso</option>
              {courses.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grado_id}° {c.paralelo} · {c.gestiones?.anio}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trimestre para calificaciones
            <select
              name="trimestre"
              defaultValue={query.get("trimestre") || ""}
            >
              <option value="">Seleccionar trimestre</option>
              {terms.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  Trimestre {t.numero} · {t.gestiones?.anio}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Asistencia desde
              <input
                className="block w-full"
                type="date"
                name="desde"
                defaultValue={query.get("desde") || ""}
              />
            </label>
            <label>
              Asistencia hasta
              <input
                className="block w-full"
                type="date"
                name="hasta"
                defaultValue={query.get("hasta") || ""}
              />
            </label>
          </div>
        </OperationForm>
      ) : mode === "editar" || mode === "eliminar" ? (
        <CrudTable
          base="/panel/informes"
          action={mode}
          rows={data.map((r) => ({
            id: r.id,
            name: r.nombre,
            detail: new URLSearchParams(r.parametros).get("tipo") || "Informe",
            status: "Guardado",
          }))}
        />
      ) : (
        <div className="crud-surface divide-y">
          {data.length ? (
            data.map((r) => (
              <Link
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-blue-50"
                href={`/panel/informes?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(r.parametros)), accion: "consultar" })}`}
              >
                <span className="font-medium">{r.nombre}</span>
                <span className="text-sm text-blue-700">Consultar informe</span>
              </Link>
            ))
          ) : (
            <p className="crud-empty">Aún no guardaste informes.</p>
          )}
        </div>
      )}
      {selected && (
        <Link
          href={`/panel/informes?accion=${mode}`}
          className="mt-5 inline-block text-blue-700"
        >
          Volver a la selección
        </Link>
      )}
    </section>
  );
}
