"use client";
import { useActionState, useState } from "react";
import {
  saveGrade,
  saveCriterion,
} from "@/app/panel/calificaciones/registro/actions";
import type { GradeSheet, GradeCriterion } from "@/lib/grades-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
const selectClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-sm";
export function CriterionForm({
  sheet,
  criterion,
}: {
  sheet: GradeSheet;
  criterion?: GradeCriterion;
}) {
  const [state, action, pending] = useActionState(saveCriterion, {});
  const [name, setName] = useState(criterion?.nombre || "");
  const [dimension, setDimension] = useState(criterion?.dimension || "SER");
  const [order, setOrder] = useState(
    String(
      criterion?.orden ||
        Math.min(
          100,
          1 +
            Math.max(
              0,
              ...sheet.criterios
                .filter((k) => k.dimension === "SER")
                .map((k) => k.orden),
            ),
        ),
    ),
  );
  const disabled = pending || !!sheet.bloqueo || sheet.criterios_bloqueados;
  const prefix = criterion?.id || "nueva";
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="space-y-4 rounded-lg border p-4"
    >
      <input type="hidden" name="asignacion" value={sheet.asignacion.id} />
      <input type="hidden" name="trimestre" value={sheet.trimestre.id} />
      <input type="hidden" name="matricula" value={sheet.matricula?.id || ""} />
      <input type="hidden" name="id" value={criterion?.id || ""} />
      <input type="hidden" name="version" value={criterion?.updated_at || ""} />
      <div className="grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)_100px]">
        <div>
          <label className="mb-2 block text-sm" htmlFor={`dimension-${prefix}`}>
            Dimensión
          </label>
          <select
            id={`dimension-${prefix}`}
            name="dimension"
            className={selectClass}
            value={dimension}
            onChange={(e) => {
              const d = e.target.value as GradeCriterion["dimension"];
              setDimension(d);
              if (!criterion)
                setOrder(
                  String(
                    Math.min(
                      100,
                      1 +
                        Math.max(
                          0,
                          ...sheet.criterios
                            .filter((k) => k.dimension === d)
                            .map((k) => k.orden),
                        ),
                    ),
                  ),
                );
            }}
            aria-readonly={!!criterion}
            disabled={disabled || !!criterion}
          >
            <option>SER</option>
            <option>SABER</option>
            <option>HACER</option>
          </select>
          {criterion && (
            <input type="hidden" name="dimension" value={criterion.dimension} />
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm" htmlFor={`nombre-${prefix}`}>
            Nombre de actividad
          </label>
          <Input
            id={`nombre-${prefix}`}
            name="nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            disabled={disabled}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm" htmlFor={`orden-${prefix}`}>
            Orden
          </label>
          <Input
            id={`orden-${prefix}`}
            name="orden"
            type="number"
            min={1}
            max={100}
            step={1}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            required
            disabled={disabled}
          />
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="accion" value="guardar" disabled={disabled}>
          {pending
            ? "Guardando…"
            : criterion
              ? "Guardar actividad"
              : "Añadir actividad"}
        </Button>
        {criterion && (
          <Button
            type="submit"
            name="accion"
            value="eliminar"
            variant="outline"
            disabled={disabled}
          >
            Eliminar actividad sin notas
          </Button>
        )}
      </div>
    </form>
  );
}
export function GradeForm({
  sheet,
  message,
}: {
  sheet: GradeSheet;
  message?: string;
}) {
  const c = sheet.calificacion;
  const initial = Object.fromEntries(
    sheet.criterios.map((k) => [
      k.id,
      String(sheet.notas.find((n) => n.criterio_id === k.id)?.puntaje ?? ""),
    ]),
  );
  const [notes, setNotes] = useState(initial),
    [auto, setAuto] = useState(String(c?.autoevaluacion ?? "")),
    [extra, setExtra] = useState(String(c?.puntos_extra ?? 0)),
    [reason, setReason] = useState(c?.motivo_extra || "");
  const [state, action, pending] = useActionState(saveGrade, {});
  const published = c?.estado === "PUBLICADO",
    locked = !!sheet.bloqueo;
  const dirty =
    JSON.stringify(notes) !== JSON.stringify(initial) ||
    auto !== String(c?.autoevaluacion ?? "") ||
    extra !== String(c?.puntos_extra ?? 0) ||
    reason !== (c?.motivo_extra || "");
  const missing = sheet.criterios.filter((k) => !notes[k.id].trim()).length;
  const missingDimensions = ["SER", "SABER", "HACER"].filter(
    (d) => !sheet.criterios.some((k) => k.dimension === d),
  );
  const complete =
    missing === 0 && auto.trim() !== "" && missingDimensions.length === 0;
  const student = sheet.alumnos.find((a) => a.id === sheet.matricula?.id);
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="space-y-5"
    >
      <input type="hidden" name="asignacion" value={sheet.asignacion.id} />
      <input type="hidden" name="trimestre" value={sheet.trimestre.id} />
      <input type="hidden" name="matricula" value={sheet.matricula!.id} />
      <input type="hidden" name="version" value={sheet.version} />
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Calificación individual · Trimestre {sheet.trimestre.numero}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{student?.nombre}</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs">
            {published ? "Publicada" : c ? "Borrador" : "Sin guardar"}
          </span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Un campo vacío significa pendiente. El cero es una nota registrada.
          Cada actividad se promedia dentro de su dimensión.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(["SER", "SABER", "HACER"] as const).map((d) => (
            <div key={d} className="rounded-lg bg-secondary/50 p-3 text-sm">
              <span className="text-muted-foreground">{d} guardado</span>
              <p className="mt-1 text-lg font-semibold">
                {c?.[d.toLowerCase() as "ser" | "saber" | "hacer"] ?? "—"}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm">
          Nota final guardada: <strong>{c?.nota_final ?? "Pendiente"}</strong> /
          100 · {c?.situacion || "PENDIENTE"}
          {dirty && " · Tienes cambios sin guardar."}
        </p>
      </Card>
      {message && !dirty && !pending && !state.error && (
        <p
          role="status"
          className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"
        >
          {message}
        </p>
      )}
      {(["SER", "SABER", "HACER"] as const).map((d) => (
        <Card key={d} className="p-5">
          <h3 className="mb-4 font-semibold">
            {d} · máximo {d === "SER" ? 10 : d === "SABER" ? 45 : 40}
          </h3>
          <div className="space-y-4">
            {sheet.criterios
              .filter((k) => k.dimension === d)
              .map((k) => (
                <div
                  key={k.id}
                  className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_130px]"
                >
                  <input type="hidden" name="criterio" value={k.id} />
                  <label htmlFor={`nota-${k.id}`} className="text-sm">
                    {k.nombre}{" "}
                    <span className="ml-2 text-xs text-muted-foreground">
                      / {k.puntaje_maximo}
                    </span>
                  </label>
                  <Input
                    id={`nota-${k.id}`}
                    name={`nota_${k.id}`}
                    type="number"
                    min={0}
                    max={k.puntaje_maximo}
                    step="0.01"
                    value={notes[k.id]}
                    onChange={(e) =>
                      setNotes({ ...notes, [k.id]: e.target.value })
                    }
                    readOnly={published || locked || pending}
                    placeholder="Pendiente"
                  />
                </div>
              ))}
          </div>
          {!sheet.criterios.some((k) => k.dimension === d) && (
            <p className="text-sm text-muted-foreground">
              Añade al menos una actividad de {d} antes de publicar.
            </p>
          )}
        </Card>
      ))}
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label htmlFor="autoevaluacion" className="mb-2 block text-sm">
            Autoevaluación / 5
          </label>
          <Input
            id="autoevaluacion"
            name="autoevaluacion"
            type="number"
            min={0}
            max={5}
            step="0.01"
            value={auto}
            onChange={(e) => setAuto(e.target.value)}
            readOnly={published || locked || pending}
            placeholder="Pendiente"
          />
        </div>
        <div>
          <label htmlFor="extra" className="mb-2 block text-sm">
            Puntos extra / 100
          </label>
          <Input
            id="extra"
            name="extra"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            readOnly={published || locked || pending}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="motivo" className="mb-2 block text-sm">
            Motivo de los puntos extra
          </label>
          <Input
            id="motivo"
            name="motivo"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            readOnly={published || locked || pending}
            maxLength={500}
            required={Number(extra) > 0}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            La nota final se limita a 100. El motivo es obligatorio si hay
            puntos extra.
          </p>
        </div>
      </Card>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {!published && !complete && (
        <p className="text-sm text-muted-foreground">
          Para publicar completa todas las actividades, la autoevaluación y las
          tres dimensiones. Puedes guardar un borrador.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {published ? (
          <Button
            name="accion"
            value="despublicar"
            disabled={locked || pending}
            variant="outline"
          >
            Despublicar para corregir
          </Button>
        ) : (
          <>
            <Button name="accion" value="guardar" disabled={locked || pending}>
              {pending ? "Guardando…" : "Guardar borrador"}
            </Button>
            <Button
              name="accion"
              value="publicar"
              variant="outline"
              disabled={locked || pending || !complete}
            >
              Guardar y publicar
            </Button>
          </>
        )}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Publicar permite a la familia autorizada consultar esta calificación.
        Despublicar la oculta hasta una nueva publicación. Guarda antes de
        cambiar de estudiante o modificar actividades.
      </p>
    </form>
  );
}
