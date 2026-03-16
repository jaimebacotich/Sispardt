"use client";

import { Printer, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCierres } from "@/hooks/useMovimientos";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-BO", {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-BO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function CierreHistorial() {
  const { data: cierres = [], isLoading } = useCierres();

  function handleImprimir(fechaReporte: string) {
    toast.info(`Imprimiendo parte diario del ${formatFecha(fechaReporte)}…`);
    // En producción: abrir ventana de impresión con el reporte de esa fecha
    window.print();
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Encabezado */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">
          Historial de Cierres de Partes Diarios
        </h3>
        <span className="text-xs text-muted-foreground">
          {cierres.length} registro{cierres.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <LoadingSpinner size="sm" />
        </div>
      ) : cierres.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No hay cierres registrados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Fecha de Reporte
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Check-in
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Check-out
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Reportado por
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Fecha y Hora
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Condición
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cierres.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  {/* Fecha */}
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    {formatFecha(c.fechaReporte)}
                  </td>

                  {/* Estado — siempre CERRADO en historial */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      <Lock size={10} />
                      Cerrado
                    </span>
                  </td>

                  {/* Checkins */}
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-sm text-foreground">{c.totalCheckins}</span>
                  </td>

                  {/* Checkouts */}
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono text-sm text-foreground">{c.totalCheckouts}</span>
                  </td>

                  {/* Reportado por */}
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {c.cerradoPor}
                  </td>

                  {/* Fecha y hora */}
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs font-mono">
                    {formatFechaHora(c.cerradoAt)}
                  </td>

                  {/* Condición */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        c.condicionEntrega === "DENTRO_PLAZO"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      )}
                    >
                      {c.condicionEntrega === "DENTRO_PLAZO" ? "En Plazo" : "Fuera Plazo"}
                    </span>
                  </td>

                  {/* Imprimir */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleImprimir(c.fechaReporte)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 px-2.5 py-1.5 rounded-lg transition-colors"
                      title="Imprimir parte diario"
                    >
                      <Printer size={13} />
                      Imprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
