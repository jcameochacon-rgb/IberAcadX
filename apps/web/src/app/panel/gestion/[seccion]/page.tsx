import { EnrolmentPanel } from "@/components/enrolment-panel";
import { TeacherAssignmentPanel } from "@/components/teacher-assignment-panel";
import { CrudHeading } from "@/components/crud-heading";
import { readAction } from "@/lib/workspace-navigation";
import { OperationForm } from "@/components/operation-form";
import { deleteRecord } from "@/app/panel/delete-actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  UsersRound,
  BookOpen,
  GraduationCap,
  UserRoundCheck,
  Presentation,
  ClipboardList,
} from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { loadPanel } from "@/lib/data/live";
import {
  loadManagement,
  loadRecord,
  loadStudentRelations,
  loadCourseYears,
  fullName,
  managementLabels,
  assignmentHasRecords,
} from "@/lib/data/management";
import {
  isManagementSection,
  canManage,
  uuidPattern,
  localToday,
} from "@/lib/management-validation";
import { PanelShell } from "@/components/panel-shell";
import { ManagementForm, type FormField } from "@/components/management-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const personFields: FormField[] = [
  { name: "nombres", label: "Nombres", required: true, maxLength: 120 },
  { name: "apellido_paterno", label: "Apellido paterno", maxLength: 120 },
  { name: "apellido_materno", label: "Apellido materno", maxLength: 120 },
  { name: "ci", label: "CI", maxLength: 40 },
  { name: "telefono", label: "Teléfono", maxLength: 40 },
  { name: "direccion", label: "Dirección", type: "textarea", maxLength: 500 },
];
const hiddenFields: FormField[] = ["id", "version", "persona_version"].map(
  (name) => ({ name, label: name, type: "hidden" }),
);
const icons = {
  estudiantes: GraduationCap,
  tutores: UserRoundCheck,
  cursos: BookOpen,
  matriculas: UsersRound,
  docentes: Presentation,
  asignaciones: ClipboardList,
};
type Query = Record<string, string | string[] | undefined>;
const textParam = (v: Query[string]) => (typeof v === "string" ? v : "");

export default async function ManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ seccion: string }>;
  searchParams: Promise<Query>;
}) {
  const { seccion } = await params;
  if (!isManagementSection(seccion)) notFound();
  const { profile } = await requireProfile();
  const model = await loadPanel();
  if (!canManage(profile.rol))
    return (
      <PanelShell model={model} current="gestion">
        <Card className="p-7">
          <h1 className="text-2xl font-semibold">Acceso restringido</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            La gestión de fichas está disponible para Dirección y Secretaría.
          </p>
          <Button asChild className="mt-5">
            <Link href="/panel">Volver al resumen</Link>
          </Button>
        </Card>
      </PanelShell>
    );
  const query = await searchParams;
  const mode = readAction(query.accion, query.id ? "editar" : "consultar");
  const id = textParam(query.id);
  if (id && !uuidPattern.test(id)) notFound();
  const editing =
    mode !== "consultar" && (Boolean(id) || textParam(query.nuevo) === "1");
  const base = `/panel/gestion/${seccion}`;
  const page = Math.max(
    1,
    Math.min(1000000, Number.parseInt(textParam(query.pagina), 10) || 1),
  );
  const q = textParam(query.q).slice(0, 100);
  const courseFilter = textParam(query.curso),
    teacherFilter = textParam(query.docente);
  if (
    (courseFilter && !uuidPattern.test(courseFilter)) ||
    (teacherFilter && !uuidPattern.test(teacherFilter))
  )
    notFound();
  const filterQuery = new URLSearchParams();
  if (courseFilter) filterQuery.set("curso", courseFilter);
  if (teacherFilter) filterQuery.set("docente", teacherFilter);
  const filterSuffix = filterQuery.size ? `&${filterQuery}` : "";
  const listing = editing
    ? null
    : await loadManagement(seccion, q, page, {
        curso: courseFilter,
        docente: teacherFilter,
      });
  const loaded = editing ? await loadRecord(seccion, id || null) : null;
  if (editing && !loaded) notFound();
  const defaults: Record<string, string> = { ...loaded?.defaults };
  const fields: FormField[] = [...hiddenFields];
  const selectedStudent = textParam(query.estudiante);
  let relatedStudent: Awaited<ReturnType<typeof loadRecord>> = null;
  if (editing && seccion === "matriculas" && !id && selectedStudent) {
    if (!uuidPattern.test(selectedStudent)) notFound();
    relatedStudent = await loadRecord("estudiantes", selectedStudent);
    if (!relatedStudent) notFound();
    defaults.estudiante_id = selectedStudent;
  }
  let assignmentLocked = false;
  if (
    seccion === "estudiantes" ||
    seccion === "tutores" ||
    seccion === "docentes"
  ) {
    if (seccion === "docentes" && !id) {
      defaults.persona_modo = "nueva";
      fields.push(
        {
          name: "persona_modo",
          label: "Datos personales",
          type: "select",
          required: true,
          options: [
            { id: "nueva", label: "Crear una ficha personal" },
            { id: "existente", label: "Usar una ficha personal existente" },
          ],
        },
        {
          name: "persona_id",
          label: "Persona",
          type: "picker",
          picker: "personas",
          required: true,
          when: { field: "persona_modo", value: "existente" },
        },
      );
      fields.push(
        ...personFields.map((f) => ({
          ...f,
          when: { field: "persona_modo" as const, value: "nueva" },
        })),
      );
    } else fields.push(...personFields);
    if (seccion === "docentes")
      fields.push({
        name: "especialidad",
        label: "Especialidad",
        maxLength: 200,
      });
    if (seccion === "estudiantes")
      fields.push(
        { name: "rude", label: "RUDE", maxLength: 40 },
        {
          name: "genero",
          label: "Género",
          type: "select",
          options: [
            { id: "M", label: "Masculino" },
            { id: "F", label: "Femenino" },
            { id: "NO_ESPECIFICADO", label: "No especificado" },
          ],
        },
        {
          name: "fecha_nacimiento",
          label: "Fecha de nacimiento",
          type: "date",
          min: "1900-01-01",
          max: localToday(),
        },
      );
    fields.push({ name: "activo", label: "Ficha activa", type: "checkbox" });
  } else if (seccion === "asignaciones" && editing) {
    const record = loaded?.record;
    const assignment = record && "docentes" in record ? record : null;
    const teacherName = fullName(assignment?.docentes?.personas || null);
    const courseName = assignment?.cursos
      ? `${assignment.cursos.grado_id}° ${assignment.cursos.paralelo} · ${assignment.cursos.gestiones?.anio}`
      : "";
    assignmentLocked = id ? await assignmentHasRecords(id) : false;
    if (!id && teacherFilter) {
      const teacher = await loadRecord("docentes", teacherFilter);
      if (!teacher) notFound();
      defaults.docente_id = teacherFilter;
      fields.push({
        name: "docente_id",
        label: "Docente",
        type: "picker",
        picker: "docentes",
        required: true,
        options: [
          {
            id: teacherFilter,
            label: [
              teacher.defaults.nombres,
              teacher.defaults.apellido_paterno,
              teacher.defaults.apellido_materno,
            ]
              .filter(Boolean)
              .join(" "),
          },
        ],
      });
    } else
      fields.push({
        name: "docente_id",
        label: "Docente",
        type: assignmentLocked ? "select" : "picker",
        picker: "docentes",
        required: true,
        readOnly: assignmentLocked,
        options: id ? [{ id: defaults.docente_id, label: teacherName }] : [],
      });
    if (!id && courseFilter) {
      const course = await loadRecord("cursos", courseFilter);
      if (!course) notFound();
      defaults.curso_id = courseFilter;
      fields.push({
        name: "curso_id",
        label: "Curso",
        type: "picker",
        picker: "cursos",
        required: true,
        options: [
          {
            id: courseFilter,
            label: `${course.defaults.grado_id}° ${course.defaults.paralelo}`,
          },
        ],
      });
    } else
      fields.push({
        name: "curso_id",
        label: "Curso",
        type: id ? "select" : "picker",
        picker: "cursos",
        required: true,
        readOnly: Boolean(id),
        options: id ? [{ id: defaults.curso_id, label: courseName }] : [],
      });
    fields.push(
      {
        name: "asignatura_id",
        label: "Materia",
        type: id ? "select" : "picker",
        picker: "asignaturas",
        required: true,
        readOnly: Boolean(id),
        options: id
          ? [
              {
                id: defaults.asignatura_id,
                label: assignment?.asignaturas?.nombre || "Materia",
              },
            ]
          : [],
      },
      { name: "activo", label: "Asignación activa", type: "checkbox" },
    );
  } else if (seccion === "cursos" && editing) {
    const years = await loadCourseYears();
    if (!id) defaults.gestion_id = years.find((y) => y.activo)?.id || "";
    fields.push(
      {
        name: "gestion_id",
        label: "Gestión",
        type: "select",
        required: true,
        readOnly: Boolean(id),
        options: years
          .filter((y) => y.activo || y.id === defaults.gestion_id)
          .map((y) => ({ id: y.id, label: String(y.anio) })),
      },
      {
        name: "grado_id",
        label: "Grado de primaria",
        type: "select",
        required: true,
        readOnly: Boolean(id),
        options: Array.from({ length: 6 }, (_, i) => ({
          id: String(i + 1),
          label: `${i + 1}° de primaria`,
        })),
      },
      {
        name: "paralelo",
        label: "Paralelo",
        maxLength: 2,
        required: true,
        readOnly: Boolean(id),
      },
      { name: "activo", label: "Curso activo", type: "checkbox" },
    );
  } else if (seccion === "matriculas" && editing) {
    const record = loaded?.record;
    const studentName =
      record && "estudiantes" in record
        ? fullName(record.estudiantes?.personas || null)
        : relatedStudent
          ? [
              relatedStudent.defaults.nombres,
              relatedStudent.defaults.apellido_paterno,
              relatedStudent.defaults.apellido_materno,
            ]
              .filter(Boolean)
              .join(" ")
          : "";
    const courseName =
      record && "cursos" in record && record.cursos
        ? `${record.cursos.grado_id}° ${record.cursos.paralelo}`
        : "";
    fields.push(
      {
        name: "estudiante_id",
        label: "Estudiante",
        type: id || selectedStudent ? "select" : "picker",
        picker: "estudiantes",
        readOnly: Boolean(id || selectedStudent),
        required: true,
        options: defaults.estudiante_id
          ? [{ id: defaults.estudiante_id, label: studentName }]
          : [],
      },
      {
        name: "curso_id",
        label: "Curso",
        type: id ? "select" : "picker",
        picker: "cursos",
        readOnly: Boolean(id),
        required: true,
        options: id ? [{ id: defaults.curso_id, label: courseName }] : [],
      },
      {
        name: "fecha_ingreso",
        label: "Fecha de ingreso",
        type: "date",
        required: true,
      },
      {
        name: "estado",
        label: "Estado de matrícula",
        type: "select",
        required: true,
        readOnly: !id,
        options: [
          { id: "ACTIVA", label: "Activa" },
          { id: "RETIRADA", label: "Retirada" },
          { id: "FINALIZADA", label: "Finalizada" },
        ],
      },
      { name: "fecha_salida", label: "Fecha de salida", type: "date" },
    );
  }
  const relations =
    seccion === "estudiantes" && id ? await loadStudentRelations(id) : null;
  const tutorId = textParam(query.tutor);
  const selectedLink = relations?.links.find((l) => l.tutor_id === tutorId);
  const Icon = icons[seccion];
  return (
    <PanelShell model={model} current="gestion">
      {seccion === "estudiantes" || seccion === "docentes" ? (
        <CrudHeading module={seccion} action={mode} />
      ) : (
        <h1 className="mb-6 text-3xl font-semibold">
          {managementLabels[seccion]}
        </h1>
      )}
      {editing && (
        <Link
          className="mb-5 inline-block text-blue-700"
          href={`${base}?accion=${mode}`}
        >
          Volver a la selección
        </Link>
      )}

      {textParam(query.eliminado) === "1" && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-blue-50 p-4 text-blue-800"
        >
          Registro eliminado correctamente.
        </p>
      )}
      {textParam(query.guardado) === "1" && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          Registro guardado correctamente.
        </p>
      )}
      {!editing &&
        seccion === "asignaciones" &&
        (courseFilter || teacherFilter) && (
          <p className="mb-4 text-sm text-muted-foreground">
            Asignaciones filtradas por{" "}
            {courseFilter && teacherFilter
              ? "curso y docente"
              : courseFilter
                ? "curso"
                : "docente"}
            .{" "}
            <Link href={base} className="text-primary">
              Ver todas
            </Link>
          </p>
        )}
      {!editing && listing && (
        <Card className="overflow-hidden">
          <form
            action={base}
            method="get"
            className="flex flex-wrap items-center gap-3 border-b border-border p-5"
          >
            <input type="hidden" name="accion" value={mode} />
            {courseFilter && (
              <input type="hidden" name="curso" value={courseFilter} />
            )}
            {teacherFilter && (
              <input type="hidden" name="docente" value={teacherFilter} />
            )}
            <Input
              name="q"
              defaultValue={q}
              aria-label="Buscar registros"
              placeholder={
                seccion === "cursos"
                  ? "Buscar paralelo…"
                  : "Buscar por nombre o apellido…"
              }
              maxLength={100}
              className="max-w-sm"
            />
            <Button variant="outline" type="submit">
              Buscar
            </Button>
            {q && (
              <Link
                href={`${base}?accion=${mode}`}
                className="text-sm text-primary"
              >
                Limpiar
              </Link>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {listing.total} registros
            </span>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{listing.title}</caption>
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  {listing.columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className="whitespace-nowrap px-5 py-3 font-medium"
                    >
                      {c.label}
                    </th>
                  ))}
                  {mode !== "consultar" && (
                    <th scope="col" className="px-5 py-3">
                      Acción
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {listing.rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    {listing.columns.map((c) => (
                      <td
                        key={c.key}
                        className="whitespace-nowrap px-5 py-4 text-xs"
                      >
                        {row.cells[c.key] || "—"}
                      </td>
                    ))}
                    {mode !== "consultar" && (
                      <td className="px-5 py-4">
                        {
                          <Link
                            aria-label={`Seleccionar ${String(Object.values(row.cells)[0])}`}
                            href={`${base}?accion=${mode}&id=${row.id}`}
                            className="inline-flex items-center gap-2 text-xs font-medium text-primary"
                          >
                            <Pencil size={14} />
                            {mode === "eliminar"
                              ? "Seleccionar para eliminar"
                              : "Editar"}
                          </Link>
                        }
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!listing.rows.length && (
            <div className="px-6 py-10 text-center">
              <Icon size={28} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-semibold">
                {q ? "No hay coincidencias" : "Aún no hay registros"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {q
                  ? "Cambia la búsqueda o vuelve a la primera página."
                  : "Usa el botón de registro para comenzar."}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border p-4 text-xs">
            <span>
              Página {page} de {Math.max(1, Math.ceil(listing.total / 25))}
            </span>
            <div className="flex gap-3">
              {page > 1 && (
                <Link
                  className="text-primary"
                  href={`${base}?accion=${mode}&pagina=${page - 1}&q=${encodeURIComponent(q)}${filterSuffix}`}
                >
                  Anterior
                </Link>
              )}
              {page * 25 < listing.total && (
                <Link
                  className="text-primary"
                  href={`${base}?accion=${mode}&pagina=${page + 1}&q=${encodeURIComponent(q)}${filterSuffix}`}
                >
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}
      {editing && mode !== "eliminar" && (
        <Card className="p-5 sm:p-7">
          <ManagementForm
            key={`${seccion}-${id || "nuevo"}-${defaults.version || ""}-${selectedStudent}-${teacherFilter}-${courseFilter}`}
            section={seccion}
            defaults={defaults}
            fields={fields}
            cancelHref={`${base}?accion=${mode}`}
            submitLabel={id ? "Guardar cambios" : "Registrar"}
          />
          <p className="mt-5 text-xs leading-6 text-muted-foreground">
            {seccion === "cursos"
              ? "Una vez creado, el curso conserva su gestión, grado y paralelo. Puedes activar o desactivar su disponibilidad."
              : seccion === "asignaciones"
                ? assignmentLocked
                  ? "Esta asignación ya tiene registros académicos: conserva el docente, curso y materia. Puedes cambiar su estado sin borrar el historial."
                  : "Curso y materia se conservan después del registro. Puedes cambiar el docente mientras la asignación no tenga horarios ni registros académicos. Solo se admite una asignación por curso y materia."
                : seccion === "docentes"
                  ? "Los datos personales pueden compartirse con otras fichas de la misma persona. Registrar un docente no crea su cuenta de inicio de sesión. Desactivarlo conserva las asignaciones y revoca su acceso operativo como docente."
                  : seccion === "matriculas"
                    ? "La fecha debe pertenecer al año del curso. Para retirar o finalizar, indica la fecha de salida. Para trasladar, cierra la matrícula anterior y registra otra sin superponer fechas."
                    : "La ficha se puede desactivar conservando sus relaciones e historial. Registrar una ficha no crea una cuenta de inicio de sesión."}
          </p>
        </Card>
      )}
      {relations && mode === "editar" && (
        <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
          <Card className="min-w-0 p-5 sm:p-7">
            <h2 className="text-lg font-semibold">Tutores vinculados</h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Actualiza parentesco, permiso de consulta y contacto principal. El
              permiso se aplica cuando el tutor tiene su cuenta vinculada.
            </p>
            <ul className="my-5 space-y-3">
              {relations.links.map((l) => (
                <li
                  key={l.tutor_id}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <p className="font-medium">
                    {fullName(l.tutores?.personas || null)}
                    {l.tutores?.activo ? "" : " · Inactivo"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.parentesco} ·{" "}
                    {l.autorizado_consulta
                      ? "Consulta autorizada"
                      : "Consulta desactivada"}
                    {l.contacto_principal ? " · Contacto principal" : ""}
                  </p>
                  <Link
                    className="mt-2 inline-block text-xs text-primary"
                    href={`${base}?id=${id}&tutor=${l.tutor_id}`}
                  >
                    Editar vínculo
                  </Link>
                </li>
              ))}
            </ul>
            {!relations.links.length && (
              <p className="my-4 text-sm text-muted-foreground">
                Aún no tiene tutores vinculados.
              </p>
            )}
            {defaults.activo === "on" ? (
              <ManagementForm
                key={selectedLink?.tutor_id || "nuevo-vinculo"}
                section="vinculos"
                defaults={{
                  estudiante_id: id,
                  tutor_id: selectedLink?.tutor_id || "",
                  parentesco: selectedLink?.parentesco || "",
                  autorizado_consulta: selectedLink
                    ? selectedLink.autorizado_consulta
                      ? "on"
                      : ""
                    : "on",
                  contacto_principal: selectedLink?.contacto_principal
                    ? "on"
                    : "",
                }}
                fields={[
                  {
                    name: "estudiante_id",
                    label: "Estudiante",
                    type: "hidden",
                  },
                  {
                    name: "tutor_id",
                    label: "Tutor",
                    type: "picker",
                    picker: "tutores",
                    required: true,
                    options: selectedLink
                      ? [
                          {
                            id: selectedLink.tutor_id,
                            label: fullName(
                              selectedLink.tutores?.personas || null,
                            ),
                          },
                        ]
                      : [],
                  },
                  {
                    name: "parentesco",
                    label: "Parentesco",
                    required: true,
                    maxLength: 80,
                  },
                  {
                    name: "autorizado_consulta",
                    label: "Autorizar consulta",
                    type: "checkbox",
                  },
                  {
                    name: "contacto_principal",
                    label: "Contacto principal",
                    type: "checkbox",
                  },
                ]}
                cancelHref={`${base}?id=${id}`}
                submitLabel={
                  selectedLink ? "Actualizar vínculo" : "Vincular tutor"
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Reactiva el estudiante para agregar o actualizar vínculos.
              </p>
            )}
          </Card>
          <Card className="min-w-0 p-5 sm:p-7">
            <EnrolmentPanel studentId={id} />
          </Card>
        </div>
      )}
      {id &&
        seccion === "docentes" &&
        mode === "editar" &&
        defaults.activo === "on" && <TeacherAssignmentPanel teacherId={id} />}
      {id && mode === "eliminar" && (
        <OperationForm action={deleteRecord} label="Eliminar registro" danger>
          <h2 className="text-lg font-semibold">
            {[
              defaults.nombres,
              defaults.apellido_paterno,
              defaults.apellido_materno,
            ]
              .filter(Boolean)
              .join(" ") || managementLabels[seccion]}
          </h2>
          <p>
            Revisa el registro seleccionado antes de confirmar. Si tiene datos
            relacionados, la eliminación será rechazada para conservar el
            historial.
          </p>
          <input
            type="hidden"
            name="table"
            value={
              seccion === "asignaciones" ? "asignaciones_docente" : seccion
            }
          />
          <input type="hidden" name="id" value={id} />
        </OperationForm>
      )}
    </PanelShell>
  );
}
