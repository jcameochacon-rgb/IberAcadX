import { uuidPattern } from "./management-validation";
export const weekdays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
] as const;
export type SchedulePeriod = {
  id: string;
  numero: number;
  hora_inicio: string | null;
  hora_fin: string | null;
  updated_at: string;
};
export type ScheduleAssignment = {
  id: string;
  nombre: string;
  docente: string | null;
  activo: boolean;
  updated_at: string;
};
export type ScheduleBlock = {
  id: string;
  asignacion_docente_id: string;
  periodo_id: string;
  dia_semana: number;
  updated_at: string;
};
export type ScheduleSheet = {
  curso: {
    id: string;
    gestion_id: string;
    grado_id: number;
    paralelo: string;
    anio: number;
  };
  periodos: SchedulePeriod[];
  asignaciones: ScheduleAssignment[];
  horarios: ScheduleBlock[];
  puede_editar: boolean;
  bloqueo: string | null;
};
export type ScheduleState = { error?: string };
export function checkScheduleId(value: string) {
  if (!uuidPattern.test(value)) throw Error("Selecciona un registro válido.");
  return value;
}
export function scheduleTimes(start: string, end: string) {
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
  )
    throw Error("Introduce ambas horas en formato HH:MM.");
  const minutes = (v: string) =>
    Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  if (
    minutes(end) - minutes(start) !== 40 ||
    minutes(start) < 840 ||
    minutes(end) > 1085
  )
    throw Error("Cada periodo debe durar 40 minutos entre 14:00 y 18:05.");
  return { start, end };
}
export function scheduleDay(value: string) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5)
    throw Error("Selecciona un día de lunes a viernes.");
  return n;
}
