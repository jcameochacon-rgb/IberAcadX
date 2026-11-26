import {
  titles,
  actionLabel,
  type WorkspaceModule,
  type Action,
} from "@/lib/workspace-navigation";
export function CrudHeading({
  module,
  action,
}: {
  module: WorkspaceModule;
  action: Action;
}) {
  return (
    <div className="crud-heading">
      <p className="crud-kicker">{actionLabel(module, action)}</p>
      <h1>{titles[module]}</h1>
      <p>
        {action === "registrar"
          ? "Completa los datos para registrar un nuevo elemento."
          : action === "editar"
            ? "Busca y selecciona el registro que necesitas actualizar."
            : action === "eliminar"
              ? "Selecciona un registro y revisa sus datos antes de confirmar la eliminación."
              : action === "generar"
                ? "Selecciona los parámetros para generar un informe de tu ámbito."
                : "Consulta los datos disponibles para tu cuenta."}
      </p>
    </div>
  );
}
