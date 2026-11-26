"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { saveSchedule } from "@/app/panel/horarios/semana/actions";
import {
  weekdays,
  type ScheduleSheet,
  type SchedulePeriod,
  type ScheduleBlock,
} from "@/lib/schedule-validation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
const selectClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-sm";
export function PeriodForm({
  period,
  course,
  disabled,
}: {
  period: SchedulePeriod;
  course: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveSchedule, {});
  const [start, setStart] = useState(period.hora_inicio?.slice(0, 5) || ""),
    [end, setEnd] = useState(period.hora_fin?.slice(0, 5) || ""),
    [confirm, setConfirm] = useState(false);
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="space-y-3 rounded-lg border p-4"
    >
      <input type="hidden" name="tipo" value="periodo" />
      <input type="hidden" name="curso" value={course} />
      <input type="hidden" name="id" value={period.id} />
      <input type="hidden" name="version" value={period.updated_at} />
      <h3 className="font-semibold">Periodo {period.numero}</h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor={`inicio-${period.id}`} className="mb-2 block text-sm">
            Inicio del periodo {period.numero}
          </label>
          <Input
            id={`inicio-${period.id}`}
            name="inicio"
            type="time"
            min="14:00"
            max="17:25"
            step={60}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            disabled={disabled || pending}
          />
        </div>
        <div>
          <label htmlFor={`fin-${period.id}`} className="mb-2 block text-sm">
            Fin del periodo {period.numero}
          </label>
          <Input
            id={`fin-${period.id}`}
            name="fin"
            type="time"
            min="14:40"
            max="18:05"
            step={60}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
            disabled={disabled || pending}
          />
        </div>
        <Button className="self-end" disabled={disabled || pending}>
          Guardar periodo {period.numero}
        </Button>
      </div>
      <label className="flex items-start gap-2 text-xs leading-5">
        <input
          className="mt-1"
          type="checkbox"
          name="confirmar"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          required
          disabled={disabled || pending}
        />
        Confirmo estas horas para todos los cursos de la gestión.
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
export function ScheduleForm({
  sheet,
  block,
}: {
  sheet: ScheduleSheet;
  block?: ScheduleBlock;
}) {
  const [state, action, pending] = useActionState(saveSchedule, {});
  const [assignment, setAssignment] = useState(
      block?.asignacion_docente_id || "",
    ),
    [period, setPeriod] = useState(block?.periodo_id || ""),
    [day, setDay] = useState(String(block?.dia_semana || 1));
  const a = sheet.asignaciones.find((a) => a.id === assignment),
    p = sheet.periodos.find((p) => p.id === period);
  const disabled = !!sheet.bloqueo || pending;
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="space-y-4"
    >
      <input type="hidden" name="tipo" value="bloque" />
      <input type="hidden" name="curso" value={sheet.curso.id} />
      <input type="hidden" name="id" value={block?.id || ""} />
      <input type="hidden" name="version" value={block?.updated_at || ""} />
      <input
        type="hidden"
        name="asignacion_version"
        value={a?.updated_at || ""}
      />
      <input type="hidden" name="periodo_version" value={p?.updated_at || ""} />
      <div>
        <label htmlFor="schedule-subject" className="mb-2 block text-sm">
          Materia y docente
        </label>
        <select
          id="schedule-subject"
          name="asignacion"
          className={selectClass}
          value={assignment}
          onChange={(e) => setAssignment(e.target.value)}
          required
          disabled={disabled}
        >
          <option value="">Selecciona una asignación</option>
          {sheet.asignaciones.map((a) => (
            <option key={a.id} value={a.id} disabled={!a.activo}>
              {a.nombre} · {a.docente || "Docente"}
              {!a.activo ? " · Inactiva" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="schedule-day" className="mb-2 block text-sm">
            Día de clase
          </label>
          <select
            id="schedule-day"
            name="dia"
            className={selectClass}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            disabled={disabled}
          >
            {weekdays.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="schedule-period" className="mb-2 block text-sm">
            Periodo de clase
          </label>
          <select
            id="schedule-period"
            name="periodo"
            className={selectClass}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={disabled}
            required
          >
            <option value="">Selecciona un periodo</option>
            {sheet.periodos.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.hora_inicio}>
                Periodo {p.numero} ·{" "}
                {p.hora_inicio
                  ? `${p.hora_inicio.slice(0, 5)}–${p.hora_fin?.slice(0, 5)}`
                  : "Sin configurar"}
              </option>
            ))}
          </select>
        </div>
      </div>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button disabled={disabled}>
          {pending
            ? "Guardando…"
            : block
              ? "Guardar cambios del bloque"
              : "Añadir bloque"}
        </Button>
        {block && (
          <Button asChild variant="outline">
            <Link href={`/panel/horarios/semana?curso=${sheet.curso.id}`}>
              Cancelar edición
            </Link>
          </Button>
        )}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Los cambios se ven inmediatamente en el horario autorizado. No hay
        borradores ni publicación adicional. Guarda antes de cambiar de curso o
        editar otro bloque.
      </p>
    </form>
  );
}
export function RemoveScheduleForm({
  block,
  course,
}: {
  block: ScheduleBlock;
  course: string;
}) {
  const [state, action, pending] = useActionState(saveSchedule, {}),
    [confirm, setConfirm] = useState(false);
  return (
    <form
      action={action}
      onReset={(e) => e.preventDefault()}
      className="mt-6 space-y-3 border-t pt-5"
    >
      <input type="hidden" name="tipo" value="retirar" />
      <input type="hidden" name="curso" value={course} />
      <input type="hidden" name="id" value={block.id} />
      <input type="hidden" name="version" value={block.updated_at} />
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          name="confirmar"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          required
          disabled={pending}
        />
        Confirmo retirar este bloque. Se elimina del horario actual; queda
        constancia en auditoría.
      </label>
      <Button variant="outline" disabled={pending}>
        Retirar bloque
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
