"use client";
import { useActionState } from "react";
export function OperationForm({
  action,
  children,
  label = "Guardar",
  danger = false,
}: {
  action: (state: string, form: FormData) => Promise<string>;
  children: React.ReactNode;
  label?: string;
  danger?: boolean;
}) {
  const [message, submit, pending] = useActionState(action, "");
  return (
    <form
      action={submit}
      onSubmit={(e) => {
        if (
          danger &&
          !confirm(
            "¿Confirmas esta eliminación? La operación puede ser rechazada si existen registros relacionados.",
          )
        )
          e.preventDefault();
      }}
      className={`operation-form ${danger ? "is-danger" : ""}`}
    >
      {children}
      <button
        disabled={pending}
        className="operation-submit disabled:opacity-50"
      >
        {pending ? "Procesando…" : label}
      </button>
      {message && (
        <p role="status" className="operation-feedback">
          {message}
        </p>
      )}
    </form>
  );
}
