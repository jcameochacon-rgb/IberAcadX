"use client";

import { useActionState, useState } from "react";
import { isRole, roleLabels, type Role } from "@iberdrola/shared";
import { Button } from "@/components/ui/button";

export function AccountCreateForm({
  action,
  roles,
  defaultRole,
  maxDate,
  invitationAvailable,
}: {
  action: (state: string, form: FormData) => Promise<string>;
  roles: Role[];
  defaultRole: Role;
  maxDate: string;
  invitationAvailable: boolean;
}) {
  const [message, submit, pending] = useActionState(action, "");
  const [role, setRole] = useState(defaultRole);
  const [recordOnly, setRecordOnly] = useState(!invitationAvailable);
  const academicRole = ["ESTUDIANTE", "DOCENTE", "PADRE"].includes(role);
  const withoutAccount = academicRole && recordOnly;

  return (
    <form action={submit} className="operation-form">
      <input type="hidden" name="persona_nueva" value="on" />
      <fieldset
        disabled={pending}
        className="grid min-w-0 gap-5 sm:grid-cols-2"
      >
        <label>
          Rol
          <select
            required
            name="rol"
            value={role}
            onChange={(event) => {
              if (isRole(event.target.value)) setRole(event.target.value);
            }}
          >
            {roles.map((item) => (
              <option key={item} value={item}>
                {roleLabels[item]}
              </option>
            ))}
          </select>
        </label>
        {academicRole && (
          <label className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                name="solo_ficha"
                value="on"
                checked={recordOnly}
                onChange={(event) => setRecordOnly(event.target.checked)}
                className="size-5 shrink-0"
              />
              Registrar solo la ficha, sin cuenta de acceso
            </span>
            <span className="text-sm font-normal text-slate-600">
              Puedes completar la gestión académica ahora y crear el acceso
              después desde Gestión de usuarios, seleccionando esta persona
              existente.
            </span>
          </label>
        )}
        {!withoutAccount && (
          <label>
            Correo electrónico
            <input
              required
              type="email"
              name="email"
              maxLength={254}
              placeholder="usuario@correo.com"
            />
          </label>
        )}
        <label>
          Nombres
          <input required name="nombres" maxLength={120} />
        </label>
        <label>
          Apellido paterno
          <input name="apellido_paterno" maxLength={120} />
        </label>
        <label>
          Apellido materno
          <input name="apellido_materno" maxLength={120} />
        </label>
        <label>
          CI
          <input name="ci" maxLength={40} />
        </label>
        <label>
          Teléfono
          <input name="telefono" maxLength={40} />
        </label>
        <label className="sm:col-span-2">
          Dirección
          <textarea name="direccion" maxLength={500} rows={3} />
        </label>
        {role === "ESTUDIANTE" && (
          <>
            <label>
              RUDE
              <input name="rude" maxLength={40} />
            </label>
            <label>
              Género
              <select name="genero" defaultValue="">
                <option value="">No especificado</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="NO_ESPECIFICADO">No especificado</option>
              </select>
            </label>
            <label>
              Fecha de nacimiento
              <input
                type="date"
                name="fecha_nacimiento"
                min="1900-01-01"
                max={maxDate}
              />
            </label>
          </>
        )}
        {role === "DOCENTE" && (
          <label>
            Especialidad
            <input name="especialidad" maxLength={200} />
          </label>
        )}
      </fieldset>
      <p className="text-sm text-muted-foreground">
        {withoutAccount
          ? "Se guardará la ficha en Supabase. No se requiere correo ni una URL pública para esta opción."
          : "Se creará la cuenta y se solicitará una invitación para configurar la contraseña."}
      </p>
      <p className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        {role === "ESTUDIANTE"
          ? "Después de registrar la ficha, matricula al estudiante en un curso desde Registro de estudiante → Editar."
          : role === "DOCENTE"
            ? "Después de registrar la ficha, asigna materias y cursos desde Gestión de docente → Editar."
            : role === "PADRE"
              ? "Después de registrar la ficha, vincula al tutor desde la ficha del estudiante y habilita la consulta."
              : "La persona recibirá un enlace para elegir su propia contraseña."}
      </p>
      {!withoutAccount && !invitationAvailable && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          Para invitar necesitas configurar la URL HTTPS y el servicio de
          cuentas en el servidor.
          {academicRole
            ? " Puedes activar Registrar solo la ficha para continuar ahora."
            : " Configura el acceso antes de crear una cuenta administrativa."}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending || (!withoutAccount && !invitationAvailable)}
      >
        {pending
          ? "Procesando…"
          : withoutAccount
            ? "Registrar ficha"
            : "Crear usuario e invitar"}
      </Button>
      {message && (
        <p role="status" className="operation-feedback">
          {message}
        </p>
      )}
    </form>
  );
}
