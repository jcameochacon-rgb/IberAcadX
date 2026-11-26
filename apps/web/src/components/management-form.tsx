"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { saveRecord, findOptions } from "@/app/panel/gestion/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  type ManagementSection,
  type ManagementState,
  type OptionKind,
} from "@/lib/management-validation";

export type FormField = {
  name: string;
  label: string;
  type?:
    "text" | "date" | "checkbox" | "select" | "textarea" | "hidden" | "picker";
  required?: boolean;
  maxLength?: number;
  min?: string;
  max?: string;
  readOnly?: boolean;
  options?: { id: string; label: string }[];
  picker?: OptionKind;
  when?: { field: "persona_modo"; value: string };
};
function Picker({
  field,
  value,
  prefix,
  onChoose,
}: {
  field: FormField;
  value: string;
  prefix: string;
  onChoose: (option: { id: string; label: string } | undefined) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState(field.options || []);
  const [selected, setSelected] = useState(value);
  const [chosen, setChosen] = useState(
    field.options?.find((o) => o.id === value),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function search() {
    setLoading(true);
    setError("");
    try {
      const result = await findOptions(field.picker!, query);
      setOptions(result.options);
      setError(
        result.error ||
          (result.options.length
            ? ""
            : "No hay coincidencias. Prueba con otro dato."),
      );
    } catch {
      setError("No se pudo buscar. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }
  const selectedOption = options.find((o) => o.id === selected) || chosen;
  return (
    <div className="space-y-2">
      <label
        htmlFor={`${prefix}-${field.name}`}
        className="block text-sm font-medium"
      >
        {field.label}
        {field.required ? " *" : ""}
      </label>
      <div className="flex gap-2">
        <Input
          aria-label={`Buscar ${field.label.toLowerCase()}`}
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            field.picker === "cursos"
              ? "Paralelo (A, B…)"
              : field.picker === "asignaturas"
                ? "Nombre de la materia"
                : field.picker === "personas"
                  ? "Nombre, apellido o CI"
                  : "Nombre o apellido"
          }
        />
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={search}
        >
          {loading ? "Buscando…" : "Buscar"}
        </Button>
      </div>
      <select
        id={`${prefix}-${field.name}`}
        name={field.name}
        required={field.required}
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setChosen(options.find((o) => o.id === e.target.value));
          onChoose(options.find((o) => o.id === e.target.value));
        }}
        className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
      >
        <option value="">Selecciona un registro</option>
        {selectedOption && !options.some((o) => o.id === selected) && (
          <option value={selected}>{selectedOption.label}</option>
        )}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="text-xs leading-5 text-muted-foreground">
        Busca para cargar hasta 50 opciones. Si falta un registro, precisa la
        búsqueda.
      </p>
      {error && (
        <p role="status" className="text-xs text-amber-800">
          {error}
        </p>
      )}
    </div>
  );
}
export function ManagementForm({
  section,
  defaults,
  fields,
  cancelHref,
  submitLabel = "Guardar cambios",
}: {
  section: ManagementSection | "vinculos";
  defaults: Record<string, string>;
  fields: FormField[];
  cancelHref: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(
    saveRecord.bind(null, section),
    {} as ManagementState,
  );
  const values = state.values || defaults;
  const [personaMode, setPersonaMode] = useState(
    defaults.persona_modo || "nueva",
  );
  const [choices, setChoices] = useState<
    Record<string, { id: string; label: string } | undefined>
  >({});
  const prefix = section;
  return (
    <form action={action} key={state.attempt || 0} className="space-y-5">
      <fieldset
        disabled={pending}
        className="grid min-w-0 gap-5 sm:grid-cols-2"
      >
        {fields.map((field) => {
          if (field.when && field.when.value !== personaMode) return null;
          const value = values[field.name] ?? "";
          const id = `${prefix}-${field.name}`;
          if (field.type === "hidden")
            return (
              <input
                key={field.name}
                type="hidden"
                name={field.name}
                value={value}
              />
            );
          if (field.type === "picker")
            return (
              <div key={field.name} className="min-w-0 sm:col-span-2">
                <Picker
                  field={{
                    ...field,
                    options:
                      choices[field.name]?.id === value
                        ? [
                            ...(field.options || []),
                            choices[field.name]!,
                          ].filter(
                            (o, i, a) =>
                              a.findIndex((v) => v.id === o.id) === i,
                          )
                        : field.options,
                  }}
                  value={value}
                  prefix={prefix}
                  onChoose={(option) =>
                    setChoices((prev) => ({ ...prev, [field.name]: option }))
                  }
                />
              </div>
            );
          if (field.type === "checkbox")
            return (
              <label
                key={field.name}
                htmlFor={id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <input
                  id={id}
                  name={field.name}
                  type="checkbox"
                  defaultChecked={value === "on"}
                  className="size-4 accent-primary"
                />
                {field.label}
              </label>
            );
          const label = (
            <label htmlFor={id} className="mb-2 block text-sm font-medium">
              {field.label}
              {field.required ? " *" : ""}
            </label>
          );
          if (field.readOnly)
            return (
              <div key={field.name}>
                {label}
                <input type="hidden" name={field.name} value={value} />
                <Input
                  id={id}
                  readOnly
                  value={
                    field.options?.find((o) => o.id === value)?.label ||
                    value ||
                    "—"
                  }
                  className="bg-muted"
                />
              </div>
            );
          return (
            <div
              key={field.name}
              className={field.type === "textarea" ? "sm:col-span-2" : ""}
            >
              {label}
              {field.type === "select" ? (
                <select
                  id={id}
                  name={field.name}
                  required={field.required}
                  defaultValue={value}
                  onChange={
                    field.name === "persona_modo"
                      ? (e) => setPersonaMode(e.target.value)
                      : undefined
                  }
                  className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona una opción</option>
                  {field.options?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={id}
                  name={field.name}
                  maxLength={field.maxLength}
                  defaultValue={value}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background p-3 text-sm"
                />
              ) : (
                <Input
                  id={id}
                  name={field.name}
                  type={field.type || "text"}
                  defaultValue={value}
                  required={field.required}
                  maxLength={field.maxLength}
                  min={field.min}
                  max={field.max}
                />
              )}
            </div>
          );
        })}
      </fieldset>
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700"
        >
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
