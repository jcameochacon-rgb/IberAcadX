import type { Role } from "@iberdrola/shared";
export const attendanceLabels = {
  A: "Presente",
  F: "Falta",
  R: "Retraso",
  L: "Licencia",
};
export type AttendanceMark = keyof typeof attendanceLabels;
export const canRecordAttendance = (role: Role) =>
  role === "DIRECTOR" || role === "SECRETARIA" || role === "DOCENTE";
export const isAttendanceId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function isAttendanceDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function todayInLaPaz(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (kind: string) => parts.find((p) => p.type === kind)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export type AttendanceRow = {
  matricula_id: string;
  matricula_version: string;
  nombre: string;
  estado: AttendanceMark | null;
  observacion: string;
  asistencia_version: string | null;
};
export type AttendanceSheet = {
  curso: {
    id: string;
    gestion_id: string;
    grado_id: number;
    paralelo: string;
    anio: number;
  };
  jornada: {
    id: string;
    updated_at: string;
    estado: "BORRADOR" | "PUBLICADO";
    observacion: string | null;
  } | null;
  filas: AttendanceRow[];
  bloqueo: string | null;
};
export type AttendanceState = { error?: string };
const validVersion = (value: unknown) =>
  typeof value === "string" &&
  value.length <= 50 &&
  /^\d{4}-\d{2}-\d{2}T/.test(value) &&
  !Number.isNaN(Date.parse(value));
export function parseAttendanceForm(form: FormData) {
  const get = (key: string) =>
    typeof form.get(key) === "string" ? String(form.get(key)) : "";
  const curso = get("curso"),
    fecha = get("fecha"),
    jornada = get("jornada"),
    version = get("version"),
    intent = get("intent"),
    observacion = get("observacion");
  if (!isAttendanceId(curso) || !isAttendanceDate(fecha))
    throw Error("Selecciona un curso y una fecha válidos.");
  if (!["guardar", "publicar", "despublicar"].includes(intent))
    throw Error("La operación no es válida.");
  if (jornada && (!isAttendanceId(jornada) || !validVersion(version)))
    throw Error("Recarga la jornada antes de continuar.");
  if (!jornada && (version || intent !== "guardar"))
    throw Error("Guarda el borrador antes de publicarlo.");
  if (observacion.length > 1000)
    throw Error("La observación de la jornada admite hasta 1000 caracteres.");
  if (intent !== "guardar")
    return { curso, fecha, jornada, version, intent, observacion, filas: [] };
  const raw = get("filas");
  if (raw.length > 500000) throw Error("La lista es demasiado grande.");
  let rows: unknown;
  try {
    rows = JSON.parse(raw);
  } catch {
    throw Error("Revisa la lista de asistencia.");
  }
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500)
    throw Error("La lista debe contener entre 1 y 500 matrículas.");
  const ids = new Set<string>();
  const filas = rows.map((row: unknown) => {
    if (!row || typeof row !== "object")
      throw Error("Revisa la lista de asistencia.");
    const r = row as Record<string, unknown>;
    if (
      typeof r.matricula_id !== "string" ||
      !isAttendanceId(r.matricula_id) ||
      ids.has(r.matricula_id) ||
      !validVersion(r.matricula_version)
    )
      throw Error("Revisa las matrículas o recarga la lista.");
    ids.add(r.matricula_id);
    if (
      r.estado !== null &&
      (typeof r.estado !== "string" ||
        !Object.hasOwn(attendanceLabels, r.estado))
    )
      throw Error("Selecciona una marca válida.");
    if (typeof r.observacion !== "string" || r.observacion.length > 500)
      throw Error("Cada observación admite hasta 500 caracteres.");
    if (r.estado === null && r.observacion.trim())
      throw Error(
        "Selecciona una marca para guardar la observación del estudiante.",
      );
    if (r.asistencia_version !== null && !validVersion(r.asistencia_version))
      throw Error("Recarga la lista antes de continuar.");
    return {
      matricula_id: r.matricula_id,
      matricula_version: r.matricula_version as string,
      estado: r.estado as AttendanceMark | null,
      observacion: r.observacion,
      asistencia_version: r.asistencia_version as string | null,
    };
  });
  return { curso, fecha, jornada, version, intent, observacion, filas };
}
