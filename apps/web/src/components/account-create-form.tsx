"use client";

import { useActionState, useState } from "react";
import { isRole, roleLabels, type Role } from "@iberdrola/shared";
import { Button } from "@/components/ui/button";

export function AccountCreateForm({
  action,
  roles,
  defaultRole,
  maxDate,
}: {
  action: (state: string, form: FormData) => Promise<string>;
  roles: Role[];
  defaultRole: Role;
  maxDate: string;
}) {
  const [message, submit, pending] = useActionState(action, "");
  const [role, setRole] = useState(defaultRole);

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
        Se creará la ficha correspondiente al rol y se enviará una invitación
        para configurar la contraseña.
      </p>
      <p className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        {role === "ESTUDIANTE"
          ? "Después de crear la cuenta, matricula al estudiante en un curso desde Registro de estudiante → Editar."
          : role === "DOCENTE"
            ? "Después de crear la cuenta, asigna materias y cursos desde Gestión de docente → Editar."
            : role === "PADRE"
              ? "Después de crear la cuenta, vincula al tutor desde la ficha del estudiante y habilita la consulta."
              : "La persona recibirá un enlace para elegir su propia contraseña."}
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Procesando…" : "Crear usuario e invitar"}
      </Button>
      {message && (
        <p role="status" className="operation-feedback">
          {message}
        </p>
      )}
    </form>
  );
}
