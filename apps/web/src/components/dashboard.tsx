import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  ChartNoAxesCombined,
} from "lucide-react";
import { PanelShell } from "./panel-shell";
import { RecordsTable } from "./records-table";
import { Card } from "./ui/card";
import type { PanelModel } from "@/lib/data/model";
const copy = {
  DIRECTOR: [
    "Visión institucional",
    "Supervisa la gestión académica y administra las cuentas de la comunidad.",
  ],
  SECRETARIA: [
    "Gestión del día",
    "Organiza estudiantes, docentes, horarios y el seguimiento académico.",
  ],
  DOCENTE: [
    "Tus aulas, al día",
    "Revisa los resultados, la asistencia y el horario de tus cursos.",
  ],
  PADRE: [
    "Acompaña cada paso",
    "Consulta los resultados y la asistencia de tus hijos vinculados. Cada registro indica a qué estudiante pertenece.",
  ],
  ESTUDIANTE: [
    "Tu avance académico",
    "Revisa tus calificaciones, tu asistencia y las materias de tu horario.",
  ],
};
export function Dashboard({ model }: { model: PanelModel }) {
  const [title, body] = copy[model.role];
  const family = model.role === "PADRE" || model.role === "ESTUDIANTE";
  const stats = [
    {
      label:
        model.role === "PADRE"
          ? "Hijos vinculados"
          : model.role === "ESTUDIANTE"
            ? "Ficha personal"
            : "Estudiantes visibles",
      value: model.studentCount,
      Icon: GraduationCap,
    },
    {
      label: "Calificaciones publicadas",
      value: model.publishedGrades,
      Icon: ChartNoAxesCombined,
    },
    {
      label: "Registros de asistencia",
      value: model.attendanceCount,
      Icon: ClipboardCheck,
    },
    {
      label: family ? "Cursos vinculados" : "Cursos visibles",
      value: model.courseCount,
      Icon: BookOpen,
    },
  ];
  return (
    <PanelShell model={model}>
      <section className="dashboard-welcome">
        <p className="dashboard-eyebrow">
          MI RESUMEN · GESTIÓN {model.year ?? "SIN CONFIGURAR"}
        </p>
        <h1>{title}</h1>
        <p>{body}</p>
        <span className="dashboard-status">
          {model.demo ? "Vista de demostración" : "Información de tu cuenta"}
        </span>
      </section>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, Icon }) => (
          <Card key={label} className="dashboard-stat p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-6 text-slate-500">{label}</p>
              <Icon
                className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600"
                size={38}
              />
            </div>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {value}
            </p>
          </Card>
        ))}
      </div>
      {family && model.courseCount === 0 && (
        <p className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
          Todavía no hay cursos vinculados visibles. Secretaría debe revisar la
          matrícula y, para familias, el vínculo con el estudiante. Los datos
          aparecerán cuando estén disponibles para tu cuenta.
        </p>
      )}
      <div className="mt-8 space-y-7">
        {(family
          ? (["calificaciones", "asistencia", "horarios"] as const)
          : (["asistencia", "calificaciones", "horarios"] as const)
        ).map((module) => (
          <section key={module}>
            <div className="mb-3">
              <h2 className="text-xl font-semibold">
                {model.listings[module].title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {model.listings[module].description}
              </p>
            </div>
            <Card className="overflow-hidden">
              <RecordsTable listing={model.listings[module]} compact />
            </Card>
          </section>
        ))}
      </div>
      <p className="mt-6 text-xs leading-6 text-slate-500">
        Las listas muestran registros recientes autorizados para tu cuenta. Usa
        el menú para consultar cada módulo. Un listado vacío no significa una
        nota cero ni una falta.
      </p>
    </PanelShell>
  );
}
