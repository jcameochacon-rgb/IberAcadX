"use server";
import { requireProfile } from "@/lib/auth";
import {
  canManage,
  localToday,
  uuidPattern,
  validDate,
} from "@/lib/management-validation";
import { isRole, type Role } from "@iberdrola/shared";
import type { Database } from "@iberdrola/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { validEmail } from "@/lib/auth-validation";
import { siteOrigin } from "@/lib/env";

function personValues(form: FormData) {
  const ci = String(form.get("ci") || "").trim();
  const telefono = String(form.get("telefono") || "").trim();
  const direccion = String(form.get("direccion") || "").trim();
  return {
    nombres: String(form.get("nombres") || "").trim(),
    apellido_paterno: String(form.get("apellido_paterno") || "").trim(),
    apellido_materno: String(form.get("apellido_materno") || "").trim(),
    ci: ci || null,
    telefono: telefono || null,
    direccion: direccion || null,
  };
}

function validatePerson(values: ReturnType<typeof personValues>) {
  if (!values.nombres || values.nombres.length > 120)
    return "Ingresa nombres de hasta 120 caracteres.";
  if (
    values.apellido_paterno.length > 120 ||
    values.apellido_materno.length > 120 ||
    (values.ci?.length || 0) > 40 ||
    (values.telefono?.length || 0) > 40 ||
    (values.direccion?.length || 0) > 500
  )
    return "Revisa la longitud de los datos personales.";
  return null;
}

type CreatedAccountData = { personId?: string; fichaId?: string };
type NewAccountResult =
  | { personId: string; fichaId?: string }
  | ({ error: string } & CreatedAccountData);
type DbClient = SupabaseClient<Database>;
type AdminClient = SupabaseClient<Database>;

function fichaError(error: { code?: string }) {
  return error.code === "23505"
    ? "Ya existe ese CI, RUDE u otro identificador."
    : "No se pudo crear la ficha. Revisa los datos y las migraciones instaladas.";
}

async function createPersonAndFicha(
  supabase: DbClient,
  role: Role,
  form: FormData,
  person: ReturnType<typeof personValues>,
): Promise<NewAccountResult> {
  if (role === "DIRECTOR" || role === "SECRETARIA") {
    const { data, error } = await supabase
      .from("personas")
      .insert(person)
      .select("id")
      .single();
    if (error || !data) return { error: fichaError(error || {}) };
    return { personId: data.id };
  }

  let fichaId: string;
  if (role === "DOCENTE") {
    const { data, error } = await supabase.rpc("guardar_docente_academico", {
      p_id: null,
      p_persona_id: null,
      p_persona: person,
      p_especialidad: String(form.get("especialidad") || "").trim() || null,
      p_activo: true,
      p_version: null,
      p_persona_version: null,
    });
    if (error || !data) return { error: fichaError(error || {}) };
    fichaId = data;
  } else {
    const section = role === "ESTUDIANTE" ? "estudiantes" : "tutores";
    const { data, error } = await supabase.rpc("guardar_ficha_academica", {
      p_tipo: section,
      p_id: null,
      p_version: null,
      p_persona_version: null,
      p_persona: person,
      p_ficha:
        role === "ESTUDIANTE"
          ? {
              rude: String(form.get("rude") || "").trim() || null,
              genero: String(form.get("genero") || "").trim() || null,
              fecha_nacimiento:
                String(form.get("fecha_nacimiento") || "").trim() || null,
              activo: true,
            }
          : { activo: true },
    });
    if (error || !data) return { error: fichaError(error || {}) };
    fichaId = data;
  }

  let personId: string | undefined;
  if (role === "DOCENTE") {
    const ficha = await supabase
      .from("docentes")
      .select("persona_id")
      .eq("id", fichaId)
      .maybeSingle();
    if (ficha.error || !ficha.data)
      return {
        error: "Se creó la ficha, pero no se pudo vincular. Intenta de nuevo.",
        fichaId,
      };
    personId = ficha.data.persona_id;
  } else if (role === "ESTUDIANTE") {
    const ficha = await supabase
      .from("estudiantes")
      .select("persona_id")
      .eq("id", fichaId)
      .maybeSingle();
    if (ficha.error || !ficha.data)
      return {
        error: "Se creó la ficha, pero no se pudo vincular. Intenta de nuevo.",
        fichaId,
      };
    personId = ficha.data.persona_id;
  } else {
    const ficha = await supabase
      .from("tutores")
      .select("persona_id")
      .eq("id", fichaId)
      .maybeSingle();
    if (ficha.error || !ficha.data)
      return {
        error: "Se creó la ficha, pero no se pudo vincular. Intenta de nuevo.",
        fichaId,
      };
    personId = ficha.data.persona_id;
  }
  if (!personId)
    return {
      error: "Se creó la ficha, pero no se pudo vincular. Intenta de nuevo.",
      fichaId,
    };
  return { personId, fichaId };
}

async function rollbackCreatedAccount(
  admin: AdminClient,
  authId: string,
  role: Role,
  created: CreatedAccountData,
) {
  const accountCleanup = await admin.auth.admin.deleteUser(authId);
  if (accountCleanup.error) return false;

  let personId = created.personId;
  if (created.fichaId && role === "ESTUDIANTE") {
    const { data, error } = await admin
      .from("estudiantes")
      .select("persona_id")
      .eq("id", created.fichaId)
      .maybeSingle();
    if (error) return false;
    personId ||= data?.persona_id;
    const removed = await admin
      .from("estudiantes")
      .delete()
      .eq("id", created.fichaId);
    if (removed.error) return false;
  } else if (created.fichaId && role === "DOCENTE") {
    const { data, error } = await admin
      .from("docentes")
      .select("persona_id")
      .eq("id", created.fichaId)
      .maybeSingle();
    if (error) return false;
    personId ||= data?.persona_id;
    const removed = await admin
      .from("docentes")
      .delete()
      .eq("id", created.fichaId);
    if (removed.error) return false;
  } else if (created.fichaId && role === "PADRE") {
    const { data, error } = await admin
      .from("tutores")
      .select("persona_id")
      .eq("id", created.fichaId)
      .maybeSingle();
    if (error) return false;
    personId ||= data?.persona_id;
    const removed = await admin
      .from("tutores")
      .delete()
      .eq("id", created.fichaId);
    if (removed.error) return false;
  }
  if (personId) {
    const removed = await admin.from("personas").delete().eq("id", personId);
    if (removed.error) return false;
  }
  return true;
}

async function validateNewFicha(
  supabase: DbClient,
  rol: Role,
  form: FormData,
  newPerson: ReturnType<typeof personValues>,
): Promise<string | null> {
  const validation = validatePerson(newPerson);
  if (validation) return validation;
  const rude = String(form.get("rude") || "").trim();
  const gender = String(form.get("genero") || "").trim();
  const birthDate = String(form.get("fecha_nacimiento") || "").trim();
  const specialty = String(form.get("especialidad") || "").trim();
  if (rol === "ESTUDIANTE") {
    if (rude.length > 40) return "El RUDE admite hasta 40 caracteres.";
    if (gender && !["M", "F", "NO_ESPECIFICADO"].includes(gender))
      return "Selecciona un género válido.";
    if (
      birthDate &&
      (!validDate(birthDate) ||
        birthDate < "1900-01-01" ||
        birthDate > localToday())
    )
      return "La fecha de nacimiento debe ser válida y no futura.";
  }
  if (rol === "DOCENTE" && specialty.length > 200)
    return "La especialidad admite hasta 200 caracteres.";

  // Comprobar duplicados antes de emitir un correo que luego quedaría sin ficha.
  if (newPerson.ci) {
    const existing = await supabase
      .from("personas")
      .select("id")
      .eq("ci", newPerson.ci)
      .maybeSingle();
    if (existing.error) return "No se pudo comprobar el CI. Reintenta.";
    if (existing.data)
      return "El CI ya tiene una ficha. Selecciona la persona existente al crear el acceso.";
  }
  if (rol === "ESTUDIANTE" && rude) {
    const existing = await supabase
      .from("estudiantes")
      .select("id")
      .eq("rude", rude)
      .maybeSingle();
    if (existing.error) return "No se pudo comprobar el RUDE. Reintenta.";
    if (existing.data)
      return "El RUDE ya está registrado. Revisa la ficha antes de crear otro acceso.";
  }

  return null;
}

export async function accountAction(_: string, form: FormData) {
  const { supabase, profile, user } = await requireProfile();
  if (!canManage(profile.rol)) return "Sin permiso.";

  const op = String(form.get("op") || "create");
  const id = String(form.get("id") || "");
  const rol = String(form.get("rol") || "");
  const persona = String(form.get("persona") || "");
  if (
    !["create", "update", "delete", "update_person", "invite_again"].includes(
      op,
    )
  )
    return "Operación inválida.";
  if (
    op !== "delete" &&
    op !== "update_person" &&
    op !== "invite_again" &&
    !isRole(rol)
  )
    return "Selecciona un rol válido.";
  if (profile.rol === "SECRETARIA" && ["DIRECTOR", "SECRETARIA"].includes(rol))
    return "Secretaría solo gestiona cuentas de docentes, estudiantes y familias.";
  if (id === user.id)
    return "No puedes modificar ni eliminar tu propia cuenta desde este formulario.";
  if (op !== "create" && !uuidPattern.test(id)) return "Cuenta inválida.";

  if (op === "update_person") {
    if (profile.rol !== "DIRECTOR")
      return "Solo Dirección puede editar los datos del personal administrativo.";
    const personaId = String(form.get("persona_id") || "");
    const version = String(form.get("version") || "");
    if (
      !uuidPattern.test(personaId) ||
      !version ||
      Number.isNaN(Date.parse(version))
    )
      return "Recarga los datos personales antes de editar.";
    const { data: account, error: accountError } = await supabase
      .from("perfiles")
      .select("persona_id,rol")
      .eq("id", id)
      .maybeSingle();
    if (accountError) return "No se pudo verificar la cuenta seleccionada.";
    if (
      !account ||
      account.rol !== "SECRETARIA" ||
      account.persona_id !== personaId
    )
      return "La ficha seleccionada no corresponde al personal administrativo.";
    const values = personValues(form);
    const validation = validatePerson(values);
    if (validation) return validation;
    const { data, error } = await supabase
      .from("personas")
      .update(values)
      .eq("id", personaId)
      .eq("updated_at", version)
      .select("id")
      .maybeSingle();
    if (error)
      return error.code === "23505"
        ? "Ya existe una ficha con ese CI."
        : "No se pudieron guardar los datos personales.";
    if (!data) return "La ficha cambió. Recarga antes de guardar.";
    revalidatePath("/panel/usuarios");
    return "Datos personales guardados.";
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (op === "invite_again") {
    const origin = siteOrigin();
    if (!url || !secret || !origin?.startsWith("https://"))
      return "Configura el servidor de correo y la URL pública antes de reenviar invitaciones.";
    const target = await supabase
      .from("perfiles")
      .select("id,rol")
      .eq("id", id)
      .maybeSingle();
    if (target.error || !target.data) return "No se pudo verificar la cuenta.";
    if (
      profile.rol === "SECRETARIA" &&
      ["DIRECTOR", "SECRETARIA"].includes(target.data.rol)
    )
      return "Cuenta protegida.";
    const admin = createClient<Database>(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const account = await admin.auth.admin.getUserById(id);
    if (account.error || !account.data.user.email)
      return "No se pudo consultar el correo de la cuenta.";
    if (account.data.user.email_confirmed_at)
      return "La cuenta ya fue activada. Su titular puede usar Recuperar contraseña en el inicio de sesión.";
    const result = await admin.auth.admin.inviteUserByEmail(
      account.data.user.email,
      { redirectTo: `${origin}/auth/invitacion` },
    );
    return result.error
      ? "No se pudo reenviar. Comprueba SMTP y espera si se alcanzó el límite de correos."
      : "Invitación reenviada al correo de la cuenta.";
  }
  const validatePersonForRole = async (role: string, personaId: string) => {
    if (role === "DOCENTE") {
      const { data, error } = await supabase
        .from("docentes")
        .select("id")
        .eq("persona_id", personaId)
        .eq("activo", true)
        .maybeSingle();
      if (error) return "No se pudo verificar la ficha del docente.";
      return data ? null : "La cuenta docente requiere una ficha activa.";
    }
    if (role === "ESTUDIANTE") {
      const { data, error } = await supabase
        .from("estudiantes")
        .select("id")
        .eq("persona_id", personaId)
        .eq("activo", true)
        .maybeSingle();
      if (error) return "No se pudo verificar la ficha del estudiante.";
      return data ? null : "La cuenta de estudiante requiere una ficha activa.";
    }
    if (role === "PADRE") {
      const { data, error } = await supabase
        .from("tutores")
        .select("id")
        .eq("persona_id", personaId)
        .eq("activo", true)
        .maybeSingle();
      if (error) return "No se pudo verificar la ficha del padre o tutor.";
      return data
        ? null
        : "La cuenta familiar debe vincularse a una ficha de tutor activa.";
    }
    return null;
  };
  if (op === "create") {
    if (form.get("solo_ficha") === "on") {
      if (
        !isRole(rol) ||
        !["ESTUDIANTE", "DOCENTE", "PADRE"].includes(rol) ||
        form.get("persona_nueva") !== "on"
      )
        return "El registro sin cuenta solo está disponible para una nueva ficha de estudiante, docente o tutor.";
      const person = personValues(form);
      const validation = await validateNewFicha(supabase, rol, form, person);
      if (validation) return validation;
      const created = await createPersonAndFicha(supabase, rol, form, person);
      if ("error" in created) {
        if (created.fichaId) {
          revalidatePath("/panel", "layout");
          return "La ficha fue creada. Revísala en Consultar antes de volver a registrar; no se creó una cuenta ni se envió correo.";
        }
        return created.error;
      }
      revalidatePath("/panel", "layout");
      return (
        "Ficha registrada correctamente, sin cuenta ni envío de correo. " +
        (rol === "ESTUDIANTE"
          ? "Ya puedes matricular al estudiante desde Registro de estudiante → Editar."
          : rol === "DOCENTE"
            ? "Ya puedes asignarle materias y cursos desde Gestión de docente → Editar."
            : "Ya puedes vincular al tutor desde la ficha del estudiante.")
      );
    }
    if (!url || !secret)
      return "Configura SUPABASE_SECRET_KEY solo en el servidor para invitar cuentas.";
    const origin = siteOrigin();
    if (!origin?.startsWith("https://"))
      return "Primero publica IberAcad y configura NEXT_PUBLIC_SITE_URL con su dirección HTTPS. Una invitación a localhost no funciona en el celular.";
    const email = String(form.get("email") || "").trim();
    if (!validEmail(email)) return "Correo inválido.";
    const admin = createClient<Database>(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (form.get("persona_nueva") === "on") {
      if (!isRole(rol)) return "Selecciona un rol válido.";
      const newPerson = personValues(form);
      const validation = await validateNewFicha(supabase, rol, form, newPerson);
      if (validation) return validation;

      const invited = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/auth/invitacion`,
      });
      if (invited.error || !invited.data.user)
        return "No se pudo invitar: verifica que la cuenta no exista y la configuración de correo.";

      const created = await createPersonAndFicha(
        supabase,
        rol,
        form,
        newPerson,
      );
      if ("error" in created) {
        const rollback = await rollbackCreatedAccount(
          admin,
          invited.data.user.id,
          rol,
          created,
        );
        return rollback
          ? created.error
          : "No se pudo crear la ficha y la invitación quedó activa o con datos parciales; verifica Auth antes de reintentar.";
      }
      const result = await supabase.rpc("administrar_cuenta", {
        p_id: invited.data.user.id,
        p_persona: created.personId,
        p_rol: rol,
        p_activo: true,
        p_eliminar: false,
      });
      if (result.error) {
        const rollback = await rollbackCreatedAccount(
          admin,
          invited.data.user.id,
          rol,
          created,
        );
        return rollback
          ? "No se pudo vincular la cuenta. Revisa que la ficha sea válida y que no exista otro perfil."
          : "No se pudo vincular la cuenta y la ficha quedó parcialmente creada; verifica Auth antes de reintentar.";
      }
      revalidatePath("/panel", "layout");
      return (
        "Cuenta y ficha creadas. Se solicitó el envío de la invitación. " +
        (rol === "ESTUDIANTE"
          ? "Ahora matricula al estudiante desde su ficha en Registro de estudiante → Editar."
          : rol === "DOCENTE"
            ? "Ahora asigna materias y cursos desde Gestión de docente → Editar."
            : rol === "PADRE"
              ? "Vincula al tutor con sus estudiantes y autoriza la consulta desde la ficha del estudiante."
              : "Revisa el correo y la carpeta de spam para configurar la contraseña.")
      );
    }

    if (!uuidPattern.test(persona)) return "Selecciona una persona.";
    const alreadyLinked = await supabase
      .from("perfiles")
      .select("id")
      .eq("persona_id", persona)
      .maybeSingle();
    if (alreadyLinked.error)
      return "No se pudo comprobar el vínculo existente.";
    if (alreadyLinked.data)
      return "Esta persona ya tiene una cuenta. Utiliza Editar para revisarla.";
    const compatibilityError = await validatePersonForRole(rol, persona);
    if (compatibilityError) return compatibilityError;
    const invited = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/invitacion`,
    });
    if (invited.error || !invited.data.user)
      return "No se pudo invitar: verifica que la cuenta no exista y la configuración de correo.";
    const result = await supabase.rpc("administrar_cuenta", {
      p_id: invited.data.user.id,
      p_persona: persona,
      p_rol: rol as
        "DIRECTOR" | "SECRETARIA" | "DOCENTE" | "PADRE" | "ESTUDIANTE",
      p_activo: true,
      p_eliminar: false,
    });
    if (result.error) {
      const cleanup = await admin.auth.admin.deleteUser(invited.data.user.id);
      if (cleanup.error)
        return "No se pudo vincular la cuenta y la invitación quedó activa; retira esa cuenta desde Auth antes de reintentar.";
      return "No se pudo vincular la cuenta. Verifica que exista la ficha del rol seleccionado y que la persona no tenga otro perfil.";
    }
  } else {
    if (op === "update" && ["DOCENTE", "ESTUDIANTE", "PADRE"].includes(rol)) {
      const { data: current, error } = await supabase
        .from("perfiles")
        .select("persona_id,rol")
        .eq("id", id)
        .maybeSingle();
      if (error) return "No se pudo verificar la cuenta seleccionada.";
      if (!current) return "La cuenta ya no está disponible.";
      if (current.rol !== rol) {
        const compatibilityError = await validatePersonForRole(
          rol,
          current.persona_id,
        );
        if (compatibilityError) return compatibilityError;
      }
    }
    const result = await supabase.rpc("administrar_cuenta", {
      p_id: id,
      p_persona: null,
      p_rol: (rol || "ESTUDIANTE") as
        "DIRECTOR" | "SECRETARIA" | "DOCENTE" | "PADRE" | "ESTUDIANTE",
      p_activo: form.get("activo") === "on",
      p_eliminar: op === "delete",
    });
    if (result.error)
      return "Operación rechazada: cuenta protegida, ficha incompatible o dependencias. El administrador no puede eliminarse a sí mismo.";
  }

  revalidatePath("/panel/usuarios");
  return op === "delete"
    ? "Acceso institucional eliminado. La identidad de autenticación se conserva para auditoría."
    : "Cuenta guardada. Las cuentas nuevas reciben un correo de invitación.";
}
