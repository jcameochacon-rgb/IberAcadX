"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
export type CrudRow = {
  id: string;
  name: string;
  detail: string;
  status: string;
<<<<<<< HEAD
=======
  info?: Record<string, string>;
  category?: string;
>>>>>>> edc0f64 (v0.12x)
};
export function CrudTable({
  rows,
  base,
  action = "consultar",
  idKey = "id",
}: {
  rows: CrudRow[];
  base: string;
  action?: string;
  idKey?: string;
}) {
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
<<<<<<< HEAD
    [page, setPage] = useState(0);
  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!status || r.status === status) &&
          `${r.name} ${r.detail}`
            .toLocaleLowerCase("es")
            .includes(q.toLocaleLowerCase("es")),
      ),
    [rows, q, status],
=======
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("asc"),
    [page, setPage] = useState(0);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  const columns = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.info || {}))),
  );
  const categories = Array.from(
    new Set(rows.map((r) => r.category).filter((v): v is string => Boolean(v))),
  );
  const visible = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            (!status || r.status === status) &&
            (!category || r.category === category) &&
            normalize(q)
              .split(/\s+/)
              .every((token) =>
                normalize(
                  `${r.name} ${r.detail} ${Object.values(r.info || {}).join(" ")}`,
                ).includes(token),
              ),
        )
        .sort(
          (a, b) =>
            (sort === "asc" ? 1 : -1) * a.name.localeCompare(b.name, "es"),
        ),
    [rows, q, status, category, sort],
>>>>>>> edc0f64 (v0.12x)
  );
  const pages = Math.max(1, Math.ceil(visible.length / 12));
  const current = Math.min(page, pages - 1);
  return (
    <div className="crud-surface">
      <div className="crud-toolbar">
        <input
          aria-label="Buscar registros"
          placeholder="Buscar por nombre o detalle…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Todos los estados</option>
          {Array.from(new Set(rows.map((r) => r.status))).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
<<<<<<< HEAD
=======
        {categories.length > 1 && (
          <select
            aria-label="Filtrar por categoría o rol"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todos los roles / categorías</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
        <select
          aria-label="Ordenar por nombre"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(0);
          }}
        >
          <option value="asc">Nombre: A–Z</option>
          <option value="desc">Nombre: Z–A</option>
        </select>
        {(q || status || category) && (
          <button
            type="button"
            className="crud-row-action"
            onClick={() => {
              setQ("");
              setStatus("");
              setCategory("");
              setPage(0);
            }}
          >
            Limpiar filtros
          </button>
        )}
>>>>>>> edc0f64 (v0.12x)
      </div>
      {visible.length ? (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Detalle</th>
<<<<<<< HEAD
=======
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
>>>>>>> edc0f64 (v0.12x)
                <th>Estado</th>
                {action !== "consultar" && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {visible.slice(current * 12, current * 12 + 12).map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-slate-500">{r.detail}</td>
<<<<<<< HEAD
=======
                  {columns.map((c) => (
                    <td key={c}>{r.info?.[c] || "—"}</td>
                  ))}
>>>>>>> edc0f64 (v0.12x)
                  <td>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                      {r.status}
                    </span>
                  </td>
                  {action !== "consultar" && (
                    <td>
                      <Link
                        className="crud-row-action"
                        href={`${base}${base.includes("?") ? "&" : "?"}accion=${action}&${idKey}=${encodeURIComponent(r.id)}`}
                      >
                        {action === "eliminar"
                          ? "Seleccionar para eliminar"
                          : "Editar"}
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="crud-empty">
          No hay registros que coincidan con tu búsqueda.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-slate-500">
        <span>
          {visible.length} registros · Página {current + 1} de {pages}
        </span>
        <div className="flex gap-2">
          <button
            className="crud-row-action disabled:opacity-40"
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            Anterior
          </button>
          <button
            className="crud-row-action disabled:opacity-40"
            disabled={current + 1 >= pages}
            onClick={() => setPage(current + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
