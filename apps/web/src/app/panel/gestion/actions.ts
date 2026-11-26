"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import {
  canManage,
  formValues,
  validateManagement,
  isManagementSection,
  searchTerm,
  type ManagementSection,
  type ManagementState,
  type OptionKind,
} from "@/lib/management-validation";

function errorMessage(
  error: { code?: string; message?: string },
  section: ManagementSection | "vinculos",
) {
  if (error.code === "PGRST202" || error.code === "42883")
    return `Falta instalar la migración ${section === "docentes" || section === "asignaciones" ? "202610060002_docentes_asignaciones.sql" : "202610060001_gestion_academica.sql"} en Supabase.`;
  if (error.code === "23505")
    if (section === "asignaciones")
      return "Ese curso ya tiene una asignación para esta materia. Busca la existente para editarla o reactivarla.";
    else if (section === "docentes")
      return "Ya existe ese CI o esa persona ya tiene ficha de docente. Busca la ficha existente o reutiliza sus datos personales.";
    else
      return "Ya existe ese CI, RUDE, curso o matrícula activa. Revisa los registros existentes.";
  if (error.code === "42501")
    return "Tu cuenta no tiene permiso para guardar este registro.";
  const known = [
    "Revisa los datos",
    "Tipo de ficha inválido",
    "El registro ya no",
    "Otra persona modificó",
    "Selecciona",
    "El curso conserva",
    "La matrícula conserva",
    "Una matrícula nueva",
    "Fecha de nacimiento futura",
    "Matrícula fuera de su gestión",
    "Matrículas superpuestas",
    "El cambio de vigencia dejaría",
    "El docente conserva",
    "La asignación conserva",
    "La asignación ya tiene",
  ];
  if (known.some((prefix) => error.message?.startsWith(prefix)))
    return error.message!;
  if (
    ["23514", "23502", "22P02", "22007", "22008", "23503"].includes(
      error.code || "",
    )
  )
    return "Los datos no cumplen las reglas de la base. Revisa fechas, estado y referencias.";
  return "No se pudo guardar. Comprueba la conexión e inténtalo de nuevo.";
}

export async function saveRecord(
  section: ManagementSection | "vinculos",
  previous: ManagementState,
  form: FormData,
): Promise<ManagementState> {
  const { supabase, profile } = await requireProfile();
  const values = formValues(form);
  const fail = (error: string) => ({
    error,
    values,
    attempt: (previous.attempt || 0) + 1,
  });
  if (!canManage(profile.rol))
    return fail("Solo Dirección y Secretaría pueden gestionar registros.");
  if (section !== "vinculos" && !isManagementSection(section))
    return fail("La sección no es válida.");
  const validation = validateManagement(section, values);
  if (validation) return fail(validation);
  let result;
  try {
    if (section === "estudiantes" || section === "tutores") {
      result = await supabase.rpc("guardar_ficha_academica", {
        p_tipo: section,
        p_id: values.id || null,
        p_version: values.version || null,
        p_persona_version: values.persona_version || null,
        p_persona: {
          nombres: values.nombres,
          apellido_paterno: values.apellido_paterno,
          apellido_materno: values.apellido_materno,
          ci: values.ci,
          telefono: values.telefono,
          direccion: values.direccion,
        },
        p_ficha: {
          rude: values.rude,
          genero: values.genero,
          fecha_nacimiento: values.fecha_nacimiento,
          activo: values.activo === "on",
        },
      });
    } else if (section === "docentes") {
      result = await supabase.rpc("guardar_docente_academico", {
        p_id: values.id || null,
        p_persona_id:
          !values.id && values.persona_modo === "existente"
            ? values.persona_id
            : null,
        p_persona: {
          nombres: values.nombres,
          apellido_paterno: values.apellido_paterno,
          apellido_materno: values.apellido_materno,
          ci: values.ci,
          telefono: values.telefono,
          direccion: values.direccion,
        },
        p_especialidad: values.especialidad,
        p_activo: values.activo === "on",
        p_version: values.version || null,
        p_persona_version: values.persona_version || null,
      });
    } else if (section === "asignaciones") {
      result = await supabase.rpc("guardar_asignacion_academica", {
        p_id: values.id || null,
        p_docente: values.docente_id,
        p_curso: values.curso_id,
        p_asignatura: values.asignatura_id,
        p_activo: values.activo === "on",
        p_version: values.version || null,
      });
    } else if (section === "cursos") {
      result = await supabase.rpc("guardar_curso_academico", {
        p_id: values.id || null,
        p_gestion: values.gestion_id,
        p_grado: Number(values.grado_id),
        p_paralelo: values.paralelo.toUpperCase(),
        p_activo: values.activo === "on",
        p_version: values.version || null,
      });
    } else if (section === "vinculos") {
      result = await supabase.rpc("vincular_tutor_academico", {
        p_estudiante: values.estudiante_id,
        p_tutor: values.tutor_id,
        p_parentesco: values.parentesco,
        p_autorizado: values.autorizado_consulta === "on",
        p_principal: values.contacto_principal === "on",
      });
    } else {
      result = await supabase.rpc("guardar_matricula_academica", {
        p_id: values.id || null,
        p_estudiante: values.estudiante_id,
        p_curso: values.curso_id,
        p_ingreso: values.fecha_ingreso,
        p_salida: values.fecha_salida || null,
        p_estado: values.estado,
        p_version: values.version || null,
      });
    }
    if (result.error) return fail(errorMessage(result.error, section));
  } catch {
    return fail(
      "No se pudo guardar. Comprueba la conexión e inténtalo de nuevo.",
    );
  }
  revalidatePath("/panel", "layout");
  const target =
    section === "vinculos"
      ? `/panel/gestion/estudiantes?id=${values.estudiante_id}`
      : `/panel/gestion/${section}?id=${result.data}`;
  redirect(`${target}&guardado=1`);
}

export async function findOptions(kind: OptionKind, query: string) {
  const { supabase, profile } = await requireProfile();
  if (!canManage(profile.rol))
    return { error: "Sin permiso para consultar registros.", options: [] };
  if (
    ![
      "estudiantes",
      "tutores",
      "cursos",
      "docentes",
      "personas",
      "asignaturas",
    ].includes(kind) ||
    typeof query !== "string"
  )
    return { error: "Consulta inválida.", options: [] };
  const term = searchTerm(query);
  if (kind === "asignaturas") {
    let request = supabase
      .from("asignaturas")
      .select("id,nombre")
      .eq("activo", true)
      .order("nombre")
      .limit(50);
    if (term) request = request.ilike("nombre", `%${term}%`);
    const { data, error } = await request;
    return {
      error: error ? "No se pudieron consultar las materias." : undefined,
      options: (data || []).map((s) => ({ id: s.id, label: s.nombre })),
    };
  }
  if (kind === "personas") {
    let request = supabase
      .from("personas")
      .select("id,nombres,apellido_paterno,apellido_materno,ci")
      .order("apellido_paterno")
      .order("id")
      .limit(50);
    if (term)
      request = request.or(
        `nombres.ilike.%${term}%,apellido_paterno.ilike.%${term}%,apellido_materno.ilike.%${term}%,ci.ilike.%${term}%`,
      );
    const { data, error } = await request;
    return {
      error: error ? "No se pudieron consultar las personas." : undefined,
      options: (data || []).map((p) => ({
        id: p.id,
        label: [
          p.nombres,
          p.apellido_paterno,
          p.apellido_materno,
          p.ci ? `· CI ${p.ci}` : "",
        ]
          .filter(Boolean)
          .join(" "),
      })),
    };
  }
  if (kind === "cursos") {
    let request = supabase
      .from("cursos")
      .select("id,grado_id,paralelo,gestiones!inner(anio,activo)")
      .eq("activo", true)
      .eq("gestiones.activo", true)
      .order("grado_id")
      .order("paralelo")
      .limit(50);
    if (term) request = request.ilike("paralelo", `%${term}%`);
    const { data, error } = await request;
    return {
      error: error ? "No se pudieron consultar los cursos." : undefined,
      options: (data || []).map((c) => ({
        id: c.id,
        label: `${c.grado_id}° ${c.paralelo} · ${c.gestiones.anio}`,
      })),
    };
  }
  let request = supabase
    .from(kind)
    .select("id,personas!inner(nombres,apellido_paterno,apellido_materno)")
    .eq("activo", true)
    .order("id")
    .limit(50);
  if (term)
    request = request.or(
      `nombres.ilike.%${term}%,apellido_paterno.ilike.%${term}%,apellido_materno.ilike.%${term}%`,
      { referencedTable: "personas" },
    );
  const { data, error } = await request;
  return {
    error: error ? "No se pudieron consultar las fichas." : undefined,
    options: (data || []).map((s) => ({
      id: s.id,
      label: [
        s.personas.nombres,
        s.personas.apellido_paterno,
        s.personas.apellido_materno,
      ]
        .filter(Boolean)
        .join(" "),
    })),
  };
}
