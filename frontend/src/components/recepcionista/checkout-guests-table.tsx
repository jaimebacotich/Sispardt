"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePartes } from "@/hooks/useMovimientos";
import type { ParteDiario } from "@/types/api";
import { cn } from "@/lib/utils";

export function CheckoutGuestsTable({ fecha }: { fecha?: string } = {}) {
  const queryParams = fecha
    ? { salidaFecha: fecha, pageSize: 500 }
    : { soloCheckout: true };
  const { data: partesRaw, isLoading } = usePartes(queryParams);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const partes = Array.isArray(partesRaw) ? partesRaw : (partesRaw as { data?: ParteDiario[] })?.data ?? [];

  const filtered = partes.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.persona.nombre.toLowerCase().includes(q) ||
      p.persona.apellidoPaterno.toLowerCase().includes(q) ||
      p.persona.documentoIdentidad.toLowerCase().includes(q) ||
      p.habNroSnapshot.toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Cabecera colapsable */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground text-left">
              Historial de Check-outs del día
            </p>
            <p className="text-xs text-muted-foreground text-left mt-0.5">
              {isLoading ? "Cargando..." : `${partes.length} salida${partes.length !== 1 ? "s" : ""} registrada${partes.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {/* Contenido expandible */}
      {open && (
        <div className="border-t border-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Buscador */}
              <div className="relative max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-xs"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Tabla */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Hab.</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Huésped</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Ingreso</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Salida</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Cond.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                          {search ? "Sin resultados." : "No hay check-outs registrados hoy."}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 font-semibold text-foreground text-xs">{p.habNroSnapshot}</td>
                          <td className="px-3 py-2.5">
                            <div className="text-xs font-medium text-foreground">
                              {p.persona.nombre} {p.persona.apellidoPaterno}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.persona.tipoDocumentoSigla}: {p.persona.documentoIdentidad}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {formatTime(p.ingresoAt)}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {p.salidaAt ? formatTime(p.salidaAt) : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                              p.condicionEntrega === "DENTRO_PLAZO"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            )}>
                              {p.condicionEntrega === "DENTRO_PLAZO" ? "En Plazo" : "Fuera Plazo"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
