import { siteOrigin } from "@/lib/env";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadPanel } from "@/lib/data/live";
import { PanelShell } from "@/components/panel-shell";
import { OperationForm } from "@/components/operation-form";
import { AccountCreateForm } from "@/components/account-create-form";
import { CrudTable } from "@/components/crud-table";
import { CrudHeading } from "@/components/crud-heading";
import { accountAction } from "./actions";
import { allowedActions, readAction } from "@/lib/workspace-navigation";
import { isRole, roles, roleLabels } from "@iberdrola/shared";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { localToday } from "@/lib/management-validation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase, profile, user } = await requireProfile(),
    query = await searchParams;
  const userModule =
    query.modulo === "familias" || query.modulo === "personal"
      ? query.modulo
      : "usuarios";
  const roleModule =
    query.modulo === "estudiantes" ||
    query.modulo === "docentes" ||
    query.modulo === "tutores"
      ? query.modulo
      : null;
  if (
    query.modulo &&
    ![
      "usuarios",
      "familias",
      "personal",
      "estudiantes",
      "docentes",
      "tutores",
    ].includes(query.modulo)
  )
    notFound();
  const categoryRole =
    userModule === "familias"
      ? "PADRE"
      : userModule === "personal"
        ? "SECRETARIA"
        : null;
  const requestedRole = query.rol && isRole(query.rol) ? query.rol : null;
  if (query.rol && !requestedRole) notFound();
  const roleForModule =
    roleModule === "estudiantes"
      ? "ESTUDIANTE"
      : roleModule === "docentes"
        ? "DOCENTE"
        : roleModule === "tutores"
          ? "PADRE"
          : null;
  if (
    (categoryRole && requestedRole !== categoryRole) ||
    (roleModule && requestedRole !== roleForModule)
  )
    notFound();
  const action = readAction(query.accion);
  const actionAllowed =
    allowedActions(profile.rol, roleModule || userModule).includes(action) &&
    (profile.rol === "DIRECTOR" || profile.rol === "SECRETARIA");
  if (!actionAllowed) notFound();
  const [people, accounts, tutors] = await Promise.all([
    supabase
      .from("personas")
      .select(
        "id,nombres,apellido_paterno,apellido_materno,ci,telefono,direccion,updated_at",
      )
      .order("nombres"),
    supabase.from("perfiles").select("*").order("created_at"),
    supabase.from("tutores").select("persona_id").eq("activo", true),
  ]);
  if (people.error || accounts.error || tutors.error)
    throw Error("No se pudieron consultar las cuentas.");
  const allowed = roles.filter(
    (r) =>
      profile.rol === "DIRECTOR" || !["DIRECTOR", "SECRETARIA"].includes(r),
  );
  if (!categoryRole && requestedRole && !allowed.includes(requestedRole))
    notFound();
  const visibleRoles = categoryRole
    ? allowed.filter((r) => r === categoryRole)
    : requestedRole
      ? allowed.filter((r) => r === requestedRole)
      : allowed;
  if (categoryRole && !visibleRoles.length) notFound();
  const tutorPeople = new Set(tutors.data.map((tutor) => tutor.persona_id));
  const name = (id: string) => {
    const p = people.data.find((x) => x.id === id);
    return p
      ? [p.nombres, p.apellido_paterno, p.apellido_materno]
          .filter(Boolean)
          .join(" ")
      : "Persona no disponible";
  };
  const rows = accounts.data.filter((a) => visibleRoles.includes(a.rol));
  const selected = rows.find((a) => a.id === query.id);
  const selectedPerson = selected
    ? people.data.find((person) => person.id === selected.persona_id)
    : undefined;
  const options = visibleRoles.map((r) => (
    <option key={r} value={r}>
      {roleLabels[r]}
    </option>
  ));
  const base = categoryRole
    ? `/panel/usuarios?modulo=${userModule}&rol=${categoryRole}`
    : requestedRole
      ? `/panel/usuarios?${roleModule ? `modulo=${roleModule}&` : ""}rol=${requestedRole}`
      : "/panel/usuarios";
  const backHref = `${base}${base.includes("?") ? "&" : "?"}accion=${action}`;
  const availablePeople = people.data.filter(
    (p) =>
      !accounts.data.some((a) => a.persona_id === p.id) &&
      ((categoryRole || requestedRole) !== "PADRE" || tutorPeople.has(p.id)),
  );
  return (
    <PanelShell model={await loadPanel()}>
      <CrudHeading module={roleModule || userModule} action={action} />
      {userModule === "usuarios" && action === "consultar" && (
        <div className="mb-5 flex justify-end">
          <Button asChild>
            <Link href="/panel/usuarios?accion=registrar">Crear usuario</Link>
          </Button>
        </div>
      )}
      {action === "registrar" ? (
        <>
          <p className="mb-5 text-sm text-slate-500">
            Registra los datos de la persona. Para estudiantes, docentes y
            tutores puedes crear solo la ficha o añadir una cuenta con
            invitación por correo.
          </p>
          <AccountCreateForm
            action={accountAction}
            roles={visibleRoles}
            defaultRole={categoryRole || visibleRoles[0]}
            maxDate={localToday()}
            invitationAvailable={Boolean(
              siteOrigin()?.startsWith("https://") &&
              process.env.SUPABASE_SECRET_KEY,
            )}
          />
          <details className="mt-6 rounded-xl border border-border p-5">
            <summary className="cursor-pointer font-medium">
              Vincular una cuenta a una ficha existente
            </summary>
            <p className="my-4 text-sm text-slate-500">
              Usa esta opción si la persona ya tiene una ficha compatible sin
              cuenta institucional.
            </p>
            <OperationForm
              action={accountAction}
              label="Invitar y vincular ficha"
            >
              <label>
                Persona
                <select required name="persona">
                  <option value="">Seleccionar persona</option>
                  {availablePeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {name(p.id)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Correo electrónico
                <input required type="email" name="email" maxLength={254} />
              </label>
              <label>
                Rol
                <select
                  required
                  name="rol"
                  defaultValue={categoryRole || visibleRoles[0]}
                >
                  {options}
                </select>
              </label>
            </OperationForm>
          </details>
        </>
      ) : selected && action !== "consultar" ? (
        <>
          <Link
            className="mb-5 inline-block text-sm text-blue-700"
            href={backHref}
          >
            Volver a la selección
          </Link>
          <h2 className="mb-5 text-xl font-semibold">
            {name(selected.persona_id)}
          </h2>
          {selected.id === user.id ? (
            <p className="crud-empty">Tu propia cuenta está protegida.</p>
          ) : action === "eliminar" ? (
            <OperationForm
              action={accountAction}
              danger
              label="Confirmar eliminación del acceso"
            >
              <input name="id" type="hidden" value={selected.id} />
              <input name="op" type="hidden" value="delete" />
              <p>
                Se eliminará el acceso institucional. Los registros académicos y
                la identidad de autenticación se conservan.
              </p>
            </OperationForm>
          ) : (
            <>
              <OperationForm action={accountAction} label="Guardar cambios">
                <input name="id" type="hidden" value={selected.id} />
                <input name="op" type="hidden" value="update" />
                <label>
                  Rol
                  <select name="rol" defaultValue={selected.rol}>
                    {options}
                  </select>
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    name="activo"
                    defaultChecked={selected.activo}
                  />{" "}
                  Cuenta activa
                </label>
              </OperationForm>
              <section className="mt-6">
                <h3 className="mb-3 text-lg font-semibold">
                  Activación por correo
                </h3>
                <OperationForm
                  action={accountAction}
                  label="Reenviar invitación pendiente"
                >
                  <input type="hidden" name="op" value="invite_again" />
                  <input type="hidden" name="id" value={selected.id} />
                  <p className="text-sm text-muted-foreground">
                    Para cuentas que aún no activaron su acceso. Si ya creó su
                    contraseña, debe utilizar Recuperar contraseña.
                  </p>
                </OperationForm>
              </section>
              {userModule === "personal" &&
                (selectedPerson ? (
                  <section className="mt-6">
                    <h3 className="mb-4 text-lg font-semibold">
                      Datos personales
                    </h3>
                    <OperationForm
                      action={accountAction}
                      label="Guardar datos personales"
                    >
                      <input name="op" type="hidden" value="update_person" />
                      <input name="id" type="hidden" value={selected.id} />
                      <input
                        name="persona_id"
                        type="hidden"
                        value={selectedPerson.id}
                      />
                      <input
                        name="version"
                        type="hidden"
                        value={selectedPerson.updated_at}
                      />
                      <label>
                        Nombres
                        <input
                          required
                          name="nombres"
                          maxLength={120}
                          defaultValue={selectedPerson.nombres}
                        />
                      </label>
                      <label>
                        Apellido paterno
                        <input
                          name="apellido_paterno"
                          maxLength={120}
                          defaultValue={selectedPerson.apellido_paterno}
                        />
                      </label>
                      <label>
                        Apellido materno
                        <input
                          name="apellido_materno"
                          maxLength={120}
                          defaultValue={selectedPerson.apellido_materno}
                        />
                      </label>
                      <label>
                        CI
                        <input
                          name="ci"
                          maxLength={40}
                          defaultValue={selectedPerson.ci || ""}
                        />
                      </label>
                      <label>
                        Teléfono
                        <input
                          name="telefono"
                          maxLength={40}
                          defaultValue={selectedPerson.telefono || ""}
                        />
                      </label>
                      <label>
                        Dirección
                        <textarea
                          name="direccion"
                          maxLength={500}
                          rows={3}
                          defaultValue={selectedPerson.direccion || ""}
                        />
                      </label>
                    </OperationForm>
                  </section>
                ) : (
                  <p className="crud-empty">Ficha personal no disponible.</p>
                ))}
            </>
          )}
        </>
      ) : (
        <CrudTable
          action={action}
          base={base}
          rows={rows.map((a) => ({
            id: a.id,
            name: name(a.persona_id),
            detail: roleLabels[a.rol],
            status: a.activo ? "Activo" : "Inactivo",
          }))}
        />
      )}
    </PanelShell>
  );
}
