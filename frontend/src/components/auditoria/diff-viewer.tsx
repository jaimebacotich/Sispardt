"use client";

import type { AuditoriaTransaccion } from "@/types/api";

interface DiffViewerProps {
  log: AuditoriaTransaccion;
}

function JsonPanel({
  title,
  data,
  type,
}: {
  title: string;
  data: Record<string, unknown> | null;
  type: "old" | "new";
}) {
  if (!data) {
    return (
      <div className="flex-1 p-4">
        <div className="text-xs text-muted-foreground mb-2">{title}</div>
        <div className="text-xs text-muted-foreground/60 italic">
          {type === "old" ? "— Sin valor anterior —" : "— Sin valor nuevo —"}
        </div>
      </div>
    );
  }

  const lines = JSON.stringify(data, null, 2).split("\n");

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="text-xs text-muted-foreground mb-2 font-medium">{title}</div>
      <pre className="text-xs font-mono leading-5">
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              type === "old"
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }
          >
            <span className="select-none text-muted-foreground/40 mr-3 w-5 inline-block text-right">
              {i + 1}
            </span>
            {line}
          </div>
        ))}
      </pre>
    </div>
  );
}

export function DiffViewer({ log }: DiffViewerProps) {
  return (
    <div className="border-t border-border">
      {/* Header */}
      <div className="bg-muted px-4 py-2.5 flex items-center justify-between border-b border-border">
        <span className="text-sm font-mono text-foreground font-medium">
          Visor de Cambios
        </span>
        <span className="text-xs font-mono text-muted-foreground">
          {log.accion} on {log.tabla}
        </span>
      </div>

      {/* Paneles side-by-side */}
      <div className="flex bg-muted/30 divide-x divide-border">
        <JsonPanel
          title="Valor Anterior"
          data={log.valorAnterior}
          type="old"
        />
        <JsonPanel
          title="Valor Nuevo"
          data={log.valorNuevo}
          type="new"
        />
      </div>
    </div>
  );
}
