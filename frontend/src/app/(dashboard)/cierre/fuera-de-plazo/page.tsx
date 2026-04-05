"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { CierrePanel } from "@/components/recepcionista/cierre-panel";
import { CierreHistorial } from "@/components/recepcionista/cierre-historial";
import { useFechasPendientes } from "@/hooks/useMovimientos";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import type { FechaPendiente } from "@/types/api";

/* ────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────── */

const DIAS_CORTO  = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return `${DIAS_CORTO[fecha.getDay()]} ${d} ${MESES_CORTO[m - 1]} ${y}`;
}

/* ────────────────────────────────────────────────────────────
 * Fila de fecha pendiente
 * ──────────────────────────────────────────────────────────── */

function FechaPendienteRow({
  item,
  selected,
  onClick,
}: {
  item: FechaPendiente;
  selected: boolean;
  onClick: () => void;
}) {
  const sinMovimiento = item.totalCheckins === 0 && item.totalCheckouts === 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors flex items-center justify-between gap-3",
        selected
          ? "bg-primary/10 dark:bg-primary/20"
          : "hover:bg-muted/50"
      )}
    >
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", selected ? "text-primary" : "text-foreground")}>
          {formatFechaCorta(item.fecha)}
        </p>
        {sinMovimiento ? (
          <p className="text-xs text-muted-foreground mt-0.5">Sin movimientos</p>
        ) : (
          <div className="flex items-center gap-3 mt-0.5">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <LogIn size={11} />
              {item.totalCheckins}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <LogOut size={11} />
              {item.totalCheckouts}
            </span>
          </div>
        )}
      </div>
      <ChevronRight
        size={16}
        className={cn(
          "flex-shrink-0 transition-colors",
          selected ? "text-primary" : "text-muted-foreground"
        )}
      />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
 * Página principal
 * ──────────────────────────────────────────────────────────── */

export default function CierreFueraDePlazoPage() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const { data: pendientes = [], isLoading, error } = useFechasPendientes();

  const sinFechaInicio =
    error instanceof ApiError && error.status === 422 &&
    (error.body as Record<string, unknown>)?.error === "FECHA_INICIO_NO_DISPONIBLE";

  function handleCierreDone() {
    // La query se invalida automáticamente, el item desaparece de la lista
    setFechaSeleccionada(null);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Cierre Fuera de Plazo"
        subtitle="Fechas pendientes de cierre anteriores a la fecha actual"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="md" />
        </div>
      ) : sinFechaInicio ? (
        /* ── Fecha de inicio no configurada en réplica ── */
        <div className="bg-card rounded-xl border border-border p-10 text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-base font-semibold text-foreground">
            Fecha de inicio no disponible
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            La fecha de inicio de operaciones aún no fue sincronizada. Intente nuevamente en unos momentos.
          </p>
        </div>
      ) : pendientes.length === 0 ? (
        /* ── Sin pendientes ── */
        <div className="bg-card rounded-xl border border-border p-10 text-center max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-base font-semibold text-foreground">
            Todas las fechas están al día
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            No hay fechas pendientes de cierre.
          </p>
        </div>
      ) : (
        /* ── Layout dos columnas ── */
        <div className="flex gap-5 items-start">
          {/* Columna izquierda — lista de fechas pendientes */}
          <div className="w-72 flex-shrink-0 bg-card rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden shadow-sm">
            {/* Header lista */}
            <div className="px-4 py-3 border-b border-border bg-amber-50 dark:bg-amber-950/30 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Fechas pendientes
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-500">
                  {pendientes.length} fecha{pendientes.length !== 1 ? "s" : ""} sin cerrar
                </p>
              </div>
            </div>

            {/* Filas */}
            <div className="divide-y divide-border">
              {pendientes.map((item) => (
                <FechaPendienteRow
                  key={item.fecha}
                  item={item}
                  selected={fechaSeleccionada === item.fecha}
                  onClick={() => setFechaSeleccionada(item.fecha)}
                />
              ))}
            </div>
          </div>

          {/* Columna derecha — panel de cierre */}
          <div className="flex-1 min-w-0">
            {fechaSeleccionada ? (
              <CierrePanel
                fecha={fechaSeleccionada}
                modo="fuera-de-plazo"
                onCierreDone={handleCierreDone}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-card rounded-xl border border-dashed border-border text-center p-6">
                <ChevronRight size={32} className="text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  Selecciona una fecha de la lista
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  para realizar el cierre correspondiente
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial completo — siempre visible */}
      <CierreHistorial />
    </div>
  );
}
