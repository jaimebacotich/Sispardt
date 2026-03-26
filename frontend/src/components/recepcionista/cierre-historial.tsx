"use client";

import { useState, useEffect } from "react";
import { Printer, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCierres, useReportePDF } from "@/hooks/useMovimientos";
import { useEstablecimientoActual } from "@/hooks/useEstablecimientoActual";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PreviewModal } from "@/app/(dashboard)/partes/imprimir/_components/PreviewModal";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const { nombre, clasificacion, categoria, direccion, telefono } = useEstablecimientoActual();

  // Fecha seleccionada para imprimir (dispara el hook)
  const [fechaImprimir, setFechaImprimir] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl]               = useState<string | null>(null);
  const [fechaDisplay, setFechaDisplay]   = useState("");
  const [imprimiendoId, setImprimiendoId] = useState<string | null>(null);

  const { data: blobUrl, isFetching, isError } = useReportePDF(
    fechaImprimir,
    nombre        ?? "",
    clasificacion ?? "",
    categoria     ?? "",
    direccion     ?? "",
    telefono      ?? ""
  );

  useEffect(() => {
    if (blobUrl && !isFetching) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(blobUrl);
      setImprimiendoId(null);
    }
  // pdfUrl se excluye intencionalmente para no crear bucles de revocación
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobUrl, isFetching]);

  useEffect(() => {
    if (isError && fechaImprimir) {
      toast.error("No se pudo generar el reporte.");
      setFechaImprimir(null);
      setImprimiendoId(null);
    }
  // fechaImprimir se lee como condición, no como disparador del efecto
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  function handleImprimir(fechaReporte: string, cierreId: string) {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setImprimiendoId(cierreId);
    setFechaDisplay(format(new Date(fechaReporte + "T12:00:00"), "dd/MM/yyyy"));
    setFechaImprimir(null);
    // Pequeño delay para forzar re-disparo si es la misma fecha
    setTimeout(() => setFechaImprimir(fechaReporte), 0);
  }

  function handleCerrarModal() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setFechaImprimir(null);
  }

  return (
    <>
      {/* Modal de preview PDF */}
      {pdfUrl && fechaImprimir && (
        <PreviewModal
          pdfUrl={pdfUrl}
          fecha={fechaDisplay}
          fechaRaw={fechaImprimir}
          nombreEstablecimiento={nombre ?? "Establecimiento"}
          onCerrar={handleCerrarModal}
        />
      )}

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
                {cierres.map((c) => {
                  const cargando = isFetching && imprimiendoId === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      {/* Fecha */}
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        {formatFecha(c.fechaReporte)}
                      </td>

                      {/* Estado */}
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.cerradoPorUsername ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-foreground">@{c.cerradoPorUsername}</span>
                            {c.cerradoPorNombreCompleto && (
                              <span className="text-xs text-muted-foreground">{c.cerradoPorNombreCompleto}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">{c.cerradoPor.slice(0, 8)}…</span>
                        )}
                      </td>

                      {/* Fecha y hora */}
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs font-mono">
                        {formatFechaHora(c.cerradoAt)}
                      </td>

                      {/* Condición */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          c.condicionEntrega === "DENTRO_PLAZO"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        )}>
                          {c.condicionEntrega === "DENTRO_PLAZO" ? "En Plazo" : "Fuera Plazo"}
                        </span>
                      </td>

                      {/* Botón imprimir */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleImprimir(c.fechaReporte, c.id)}
                          disabled={isFetching}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Generar reporte de parte diario"
                        >
                          {cargando
                            ? <><div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Generando…</>
                            : <><Printer size={13} />Imprimir</>
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
