"use client";
import { useActionState, useState } from "react";
import { Save, ClipboardCheck, LoaderCircle } from "lucide-react";
import { saveAttendance } from "@/app/panel/asistencia/registro/actions";
import {
  attendanceLabels,
  type AttendanceMark,
  type AttendanceSheet,
} from "@/lib/attendance-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
export function AttendanceForm({
  sheet,
  fecha,
  message,
}: {
  sheet: AttendanceSheet;
  fecha: string;
  message?: string;
}) {
  const [rows, setRows] = useState(sheet.filas);
  const [note, setNote] = useState(sheet.jornada?.observacion || "");
  const [state, action, pending] = useActionState(saveAttendance, {});
  const published = sheet.jornada?.estado === "PUBLICADO";
  const locked = !!sheet.bloqueo;
  const missing = rows.filter((r) => r.estado === null).length;
  const dirty =
    JSON.stringify(rows) !== JSON.stringify(sheet.filas) ||
    note !== (sheet.jornada?.observacion || "");
  const disabled = pending || locked || published;
  const counts = Object.entries(attendanceLabels).map(([key, label]) => ({
    key,
    label,
    count: rows.filter((r) => r.estado === key).length,
  }));
  const payload = rows.map(
    ({
      matricula_id,
      matricula_version,
      estado,
      observacion,
      asistencia_version,
    }) => ({
      matricula_id,
      matricula_version,
      estado,
      observacion,
      asistencia_version,
    }),
  );
  return (
    <form
      action={action}
      onReset={(event) => event.preventDefault()}
      className="space-y-5"
    >
      {message && !dirty && !pending && !state.error && (
        <p
          role="status"
          className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"
        >
          {message}
        </p>
      )}
      <input type="hidden" name="curso" value={sheet.curso.id} />
      <input type="hidden" name="fecha" value={fecha} />
      <input type="hidden" name="jornada" value={sheet.jornada?.id || ""} />
      <input
        type="hidden"
        name="version"
        value={sheet.jornada?.updated_at || ""}
      />
      <input type="hidden" name="filas" value={JSON.stringify(payload)} />
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-5"
        aria-label="Resumen de marcas"
      >
        {[
          ...counts,
          { key: "pendiente", label: "Sin marcar", count: missing },
        ].map((c) => (
          <Card key={c.key} className="p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.count}</p>
          </Card>
        ))}
      </div>
      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm"
        >
          {state.error} Tus marcas se mantienen. Si pide recargar, revisa los
          cambios antes de reemplazarlas.
        </div>
      )}
      {sheet.bloqueo && (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted p-4 text-sm"
        >
          {sheet.bloqueo}
        </p>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-semibold">
              Lista del curso{" "}
              <span className="text-primary">· {rows.length} estudiantes</span>
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Matrículas vigentes en la fecha seleccionada. Cada marca queda en
              borrador hasta publicar.
            </p>
          </div>
          {!published && !locked && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || missing === 0}
              onClick={() =>
                setRows(
                  rows.map((r) =>
                    r.estado === null ? { ...r, estado: "A" } : r,
                  ),
                )
              }
            >
              Marcar pendientes como presentes
            </Button>
          )}
        </div>
        <div className="divide-y divide-border">
          {rows.map((r, index) => (
            <div
              key={r.matricula_id}
              className="grid items-center gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_190px_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 break-words text-sm font-medium">
                  {r.nombre}
                </p>
              </div>
              <div>
                <label
                  htmlFor={`mark-${r.matricula_id}`}
                  className="mb-2 block text-xs text-muted-foreground"
                >
                  Marca
                </label>
                <select
                  id={`mark-${r.matricula_id}`}
                  aria-label={`Marca de ${r.nombre}`}
                  value={r.estado || ""}
                  disabled={disabled}
                  onChange={(e) =>
                    setRows(
                      rows.map((x) =>
                        x.matricula_id === r.matricula_id
                          ? {
                              ...x,
                              estado: (e.target.value ||
                                null) as AttendanceMark | null,
                            }
                          : x,
                      ),
                    )
                  }
                  className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-70"
                >
                  <option value="">Sin marcar</option>
                  {Object.entries(attendanceLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {id} · {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor={`note-${r.matricula_id}`}
                  className="mb-2 block text-xs text-muted-foreground"
                >
                  Observación opcional
                </label>
                <Input
                  id={`note-${r.matricula_id}`}
                  aria-label={`Observación de ${r.nombre}`}
                  value={r.observacion}
                  maxLength={500}
                  disabled={disabled}
                  onChange={(e) =>
                    setRows(
                      rows.map((x) =>
                        x.matricula_id === r.matricula_id
                          ? { ...x, observacion: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
          {!rows.length && (
            <p className="p-6 text-sm text-muted-foreground">
              No hay matrículas vigentes para esta fecha.
            </p>
          )}
        </div>
      </Card>
      <Card className="p-5">
        <label htmlFor="day-note" className="mb-2 block text-sm font-medium">
          Observación de la jornada
        </label>
        <textarea
          id="day-note"
          name="observacion"
          value={note}
          disabled={disabled}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full rounded-lg border border-input bg-background p-3 text-sm disabled:opacity-70"
        />
        <div className="mt-5 flex flex-wrap gap-3">
          {!published && (
            <Button
              type="submit"
              name="intent"
              value="guardar"
              disabled={pending || locked || !rows.length}
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar borrador
            </Button>
          )}
          {!published && sheet.jornada && (
            <Button
              type="submit"
              variant="outline"
              name="intent"
              value="publicar"
              disabled={
                pending || locked || missing > 0 || dirty || !rows.length
              }
            >
              <ClipboardCheck className="size-4" />
              Publicar jornada
            </Button>
          )}
          {published && (
            <Button
              type="submit"
              variant="outline"
              name="intent"
              value="despublicar"
              disabled={pending || locked}
            >
              Despublicar para corregir
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          {published
            ? "La jornada publicada está disponible para la familia autorizada. Despublica antes de corregir; las correcciones quedan en borrador hasta volver a publicar."
            : dirty
              ? "Hay cambios sin guardar. Guarda el borrador antes de publicar o cambiar de curso y fecha."
              : missing
                ? `Faltan ${missing} marcas. Puedes guardar el borrador y completarlo después.`
                : "Guarda el borrador y publica la jornada para que la familia autorizada pueda consultar las marcas."}
        </p>
      </Card>
    </form>
  );
}
