"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { reportColumns, type Report } from "@/lib/reports";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (value: string) => void };
  }
}
export function PrintReport({
  report,
  csvHref,
}: {
  report: Report;
  csvHref?: string;
}) {
  const [message, setMessage] = useState("");
  const send = (format: "pdf" | "csv") => {
    if (window.ReactNativeWebView) {
      const cols = reportColumns[report.tipo];
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: `iberacad.report.${format}`,
          title:
            report.tipo === "asistencia"
              ? "Resumen de asistencia"
              : "Calificaciones publicadas",
          subtitle: `U.E. Iberdrola A · ${report.curso} · Gestión ${report.gestion} · ${report.periodo} · ${new Date(report.generado).toLocaleString("es-BO", { timeZone: "America/La_Paz" })} (Bolivia)`,
          columns: cols.map(([, label]) => label),
          rows: report.filas.map((row) =>
            cols.map(([key]) => String(row[key] ?? "—")),
          ),
        }),
      );
      setMessage("La app preparará el archivo para guardarlo o compartirlo.");
    } else if (format === "csv" && csvHref) window.location.assign(csvHref);
    else window.print();
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={() => send(csvHref ? "csv" : "pdf")}
        variant={csvHref ? "outline" : "default"}
      >
        {csvHref ? "Descargar CSV" : "Imprimir / Guardar PDF"}
      </Button>
      {message && (
        <p role="status" className="w-full text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
