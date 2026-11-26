"use client";
import { useState } from "react";
import { type Action, type WorkspaceModule } from "@/lib/workspace-navigation";
const examples: Record<WorkspaceModule, string[]> = {
  usuarios: ["Usuario de ejemplo", "Docente de ejemplo"],
  estudiantes: ["Lucía Ejemplo", "Mateo Ejemplo"],
  docentes: ["Ana Ejemplo", "Carlos Ejemplo"],
  tutores: ["María Ejemplo · Madre", "Carlos Ejemplo · Padre"],
  familias: ["Acceso de María Ejemplo", "Acceso de Carlos Ejemplo"],
  personal: ["Secretaría de ejemplo"],
  cursos: ["1° A · Gestión 2026", "2° B · Gestión 2026"],
  asignaciones: ["Ana Ejemplo · Matemática · 1° A"],
  matriculas: ["Lucía Ejemplo · 1° A · Activa"],
  asignaturas: ["Matemática", "Lenguaje"],
  horarios: ["Lunes · Matemática", "Martes · Lenguaje"],
  asistencia: ["Lucía Ejemplo · Presente", "Mateo Ejemplo · Presente"],
  calificaciones: ["Lucía Ejemplo · 85 puntos", "Mateo Ejemplo · 90 puntos"],
  informes: ["Asistencia mensual", "Calificaciones trimestrales"],
};
export function DemoOperation({
  module,
  action,
}: {
  module: WorkspaceModule;
  action: Action;
}) {
  const [rows, setRows] = useState(examples[module]),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState<number | null>(null),
    [name, setName] = useState(""),
    [message, setMessage] = useState("");
  const form =
    action === "registrar" || action === "generar" || selected !== null;
  return (
    <div className="crud-surface p-6">
      <p className="mb-5 text-sm text-slate-500">
        Vista de demostración. Los cambios de esta pantalla son temporales y no
        se guardan en Supabase.
      </p>
      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-blue-50 p-4 text-blue-800"
        >
          {message}
        </p>
      )}
      {!form ? (
        <>
          <div className="crud-toolbar">
            <input
              aria-label="Buscar registros"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar en esta demostración…"
            />
          </div>
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Registro</th>
                  <th>Estado</th>
                  {action !== "consultar" && <th>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(
                  (r, i) =>
                    r.toLowerCase().includes(q.toLowerCase()) && (
                      <tr key={i}>
                        <td>{r}</td>
                        <td>Demostración</td>
                        {action !== "consultar" && (
                          <td>
                            <button
                              className="crud-row-action"
                              onClick={() => {
                                setSelected(i);
                                setName(r);
                                setMessage("");
                              }}
                            >
                              {action === "eliminar"
                                ? "Seleccionar para eliminar"
                                : "Editar"}
                            </button>
                          </td>
                        )}
                      </tr>
                    ),
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <form
          className="max-w-xl space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (action === "eliminar") {
              setRows(rows.filter((_, i) => i !== selected));
              setSelected(null);
              setMessage("Registro retirado de esta demostración.");
            } else {
              if (selected !== null)
                setRows(rows.map((r, i) => (i === selected ? name : r)));
              else setRows([...rows, name]);
              setSelected(null);
              setName("");
              setMessage(
                action === "generar"
                  ? "Informe de ejemplo generado. La generación con datos reales está disponible al iniciar sesión."
                  : "Cambio aplicado únicamente en esta demostración.",
              );
            }
          }}
        >
          {action === "eliminar" ? (
            <p>
              ¿Eliminar <strong>{name}</strong> de esta demostración?
            </p>
          ) : (
            <label className="block text-sm font-medium">
              {action === "generar"
                ? "Nombre del informe"
                : "Nombre o descripción"}
              <input
                className="mt-2 block w-full rounded-xl border p-3"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              className={`rounded-xl px-5 py-3 font-medium text-white ${action === "eliminar" ? "bg-red-600" : "bg-blue-700"}`}
            >
              {action === "eliminar"
                ? "Confirmar eliminación"
                : action === "generar"
                  ? "Generar ejemplo"
                  : "Guardar ejemplo"}
            </button>
            {selected !== null && (
              <button
                type="button"
                className="crud-row-action"
                onClick={() => setSelected(null)}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
