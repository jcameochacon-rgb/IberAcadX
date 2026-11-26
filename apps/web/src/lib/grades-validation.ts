export type GradeCriterion = {
  id: string;
  dimension: "SER" | "SABER" | "HACER";
  nombre: string;
  orden: number;
  puntaje_maximo: number;
  updated_at: string;
};
export type GradeSheet = {
  version: string;
  bloqueo: string | null;
  criterios_bloqueados: boolean;
  asignacion: { id: string };
  trimestre: { id: string; numero: number; estado: string };
  matricula: { id: string } | null;
  criterios: GradeCriterion[];
  notas: { criterio_id: string; puntaje: number }[];
  alumnos: {
    id: string;
    nombre: string;
    estado: string;
    nota_final: number | null;
  }[];
  calificacion: {
    id: string;
    estado: string;
    autoevaluacion: number | null;
    puntos_extra: number;
    motivo_extra: string | null;
    ser: number | null;
    saber: number | null;
    hacer: number | null;
    nota_final: number | null;
    situacion: string;
  } | null;
};
export type GradeState = { error?: string };
export const canRecordGrades = (role: string) =>
  role === "DIRECTOR" || role === "SECRETARIA" || role === "DOCENTE";
export const gradeId = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function gradeNumber(
  value: string,
  max: number,
  optional = true,
): number | null {
  const v = value.trim();
  if (!v && optional) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(v) || Number(v) > max)
    throw Error(
      `Introduce un número entre 0 y ${max}, con hasta dos decimales.`,
    );
  return Number(v);
}
export function parseGradeForm(form: FormData) {
  const text = (k: string) => String(form.get(k) ?? "");
  const asignacion = text("asignacion"),
    trimestre = text("trimestre"),
    matricula = text("matricula"),
    version = text("version"),
    accion = text("accion");
  if (
    ![asignacion, trimestre, matricula].every(gradeId) ||
    !/^[0-9a-f]{32}$/.test(version) ||
    !["guardar", "publicar", "despublicar"].includes(accion)
  )
    throw Error("Recarga el formulario y selecciona una matrícula válida.");
  const ids = form.getAll("criterio").map(String);
  if (
    ids.length > 100 ||
    new Set(ids).size !== ids.length ||
    !ids.every(gradeId)
  )
    throw Error("Revisa las actividades.");
  const notas = ids.map((id) => ({
    criterio_id: id,
    puntaje: gradeNumber(text(`nota_${id}`), 45),
  }));
  const auto = gradeNumber(text("autoevaluacion"), 5),
    extra = gradeNumber(text("extra"), 100, false)!;
  const motivo = text("motivo").trim();
  if (motivo.length > 500 || (extra > 0 && !motivo))
    throw Error(
      "Los puntos extra necesitan un motivo de hasta 500 caracteres.",
    );
  return {
    asignacion,
    trimestre,
    matricula,
    version,
    accion,
    notas,
    auto,
    extra,
    motivo,
  };
}
