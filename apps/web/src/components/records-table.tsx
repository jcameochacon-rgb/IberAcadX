"use client";
import { useMemo, useState } from "react";
import { Search, FolderOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Listing } from "@/lib/data/model";
export function RecordsTable({
  listing,
  compact = false,
}: {
  listing: Listing;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(
    () =>
      listing.rows.filter((row) =>
        Object.values(row.cells).some((value) =>
          String(value ?? "")
            .toLocaleLowerCase("es")
            .includes(search.toLocaleLowerCase("es")),
        ),
      ),
    [listing.rows, search],
  );
  const size = compact ? 5 : 10;
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * size, (current + 1) * size);
  return (
    <div>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div className="relative w-full max-w-sm">
            <Search
              className="absolute left-3 top-3.5 text-muted-foreground"
              size={16}
            />
            <Input
              aria-label={`Buscar en ${listing.title}`}
              placeholder="Buscar en los registros cargados…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="h-11 pl-9"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {listing.total} registros disponibles
          </span>
        </div>
      )}
      {rows.length ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{listing.title}</caption>
              <thead className="bg-[#f9fbfb] text-[11px] text-muted-foreground">
                <tr>
                  {listing.columns.map((col) => (
                    <th
                      className="whitespace-nowrap px-5 py-3.5 font-medium"
                      key={col.key}
                      scope="col"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    className="border-t border-border hover:bg-muted/30"
                    key={row.id}
                  >
                    {listing.columns.map((col, i) => (
                      <td
                        key={col.key}
                        className={cn(
                          "whitespace-nowrap px-5 py-4 text-xs",
                          i === 0
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {col.key === "status" ? (
                          <Badge
                            className={cn(
                              row.tone === "success"
                                ? "bg-emerald-50 text-emerald-700"
                                : row.tone === "danger"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-800",
                            )}
                          >
                            {row.cells[col.key] || "Pendiente"}
                          </Badge>
                        ) : (
                          (row.cells[col.key] ?? "—")
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!compact && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5 text-xs text-muted-foreground">
              <p>
                {filtered.length} coincidencias en {listing.rows.length}{" "}
                registros cargados
                {listing.total > listing.rows.length
                  ? ` · Se muestran los últimos ${listing.rows.length} de ${listing.total}`
                  : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Página anterior"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span>
                  {current + 1} / {pages}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Página siguiente"
                  disabled={current + 1 >= pages}
                  onClick={() => setPage(current + 1)}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
          <FolderOpen className="mb-3 text-muted-foreground/60" size={28} />
          <p className="text-sm font-semibold">
            {search
              ? "No encontramos coincidencias"
              : "Aún no hay registros disponibles"}
          </p>
          <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
            {search
              ? "Prueba con otro nombre o dato."
              : "La información aparecerá cuando se registre y esté disponible para tu rol."}
          </p>
        </div>
      )}
    </div>
  );
}
