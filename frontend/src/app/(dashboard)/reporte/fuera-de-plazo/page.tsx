"use client";

import { useState, useMemo } from "react";
import { Plus, X, AlertTriangle, FileWarning, Lock, ClipboardCheck } from "lucide-react";
import { CheckinWizard } from "@/components/recepcionista/checkin-wizard";
import { ActiveGuestsTable } from "@/components/recepcionista/active-guests-table";
import { CheckoutGuestsTable } from "@/components/recepcionista/checkout-guests-table";
import { CheckoutModal } from "@/components/recepcionista/checkout-modal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import type { ParteDiario } from "@/types/api";
import { useFechasPendientes, useCierres } from "@/hooks/useMovimientos";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type EstadoParte = "Abierto" | "Cerrado";
type Condicion   = "FUERA_PLAZO" | "DENTRO_PLAZO";

interface FilaHistorial {
  id: string;
  fecha: string;        // ISO "YYYY-MM-DD"
  estado: EstadoParte;
  checkins: number;
  checkouts: number;
  reportadoPor: string | null;
  reportadoPorNombre: string | null;
  fechaHora: string | null; // ISO datetime, null si abierto
  condicion: Condicion;
}

// ── Helpers de formato ─────────────────────────────────────────────────────────

const DIAS = [
  "domingo", "lunes", "martes", "miércoles",
  "jueves", "viernes", "sábado",
];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatFechaLarga(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  const dia   = DIAS[fecha.getDay()];
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)}, ${d} de ${MESES[m - 1]} de ${y}`;
}

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-BO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ReporteFueraDePlazoPage() {
  const [fechaActiva, setFechaActiva]       = useState<string | null>(null);
  const [showWizard, setShowWizard]         = useState(false);
  const [parteParaCheckout, setParteParaCheckout] = useState<ParteDiario | null>(null);

  const { data: pendientesRaw, isLoading: loadingPendientes } = useFechasPendientes();
  const { data: cierresRaw,    isLoading: loadingCierres    } = useCierres();

  const isLoading = loadingPendientes || loadingCierres;

  const historial = useMemo<FilaHistorial[]>(() => {
    const pendientes = Array.isArray(pendientesRaw) ? pendientesRaw : [];
    const cierres    = Array.isArray(cierresRaw)    ? cierresRaw    : [];

    const filasPendientes: FilaHistorial[] = pendientes.map((p) => ({
      id:           `pendiente-${p.fecha}`,
      fecha:        p.fecha,
      estado:       "Abierto",
      checkins:     p.totalCheckins,
      checkouts:    p.totalCheckouts,
      reportadoPor: null,
      reportadoPorNombre: null,
      fechaHora:    null,
      condicion:    "FUERA_PLAZO",
    }));

    const filasCierres: FilaHistorial[] = cierres.map((c) => ({
      id:           c.id,
      fecha:        c.fechaReporte,
      estado:       "Cerrado",
      checkins:     c.totalCheckins,
      checkouts:    c.totalCheckouts,
      reportadoPor: c.cerradoPorUsername ?? c.cerradoPor,
      reportadoPorNombre: c.cerradoPorNombreCompleto ?? null,
      fechaHora:    c.cerradoAt,
      condicion:    c.condicionEntrega as Condicion,
    }));

    return [...filasPendientes, ...filasCierres].sort((a, b) =>
      b.fecha.localeCompare(a.fecha)
    );
  }, [pendientesRaw, cierresRaw]);

  function handleRegistrar(fecha: string) {
    setFechaActiva(fecha);
    setShowWizard(false);
    // scroll suave al tope
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Banner Fuera de Plazo ─────────────────────────────────────────── */}
      <div
        className={cn(
          "rounded-xl border p-5 flex items-start gap-4 transition-all",
          fechaActiva
            ? "bg-amber-50 border-amber-300 dark:bg-amber-950/25 dark:border-amber-700"
            : "bg-card border-border"
        )}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            fechaActiva
              ? "bg-amber-100 dark:bg-amber-950/60"
              : "bg-muted"
          )}
        >
          <FileWarning
            size={20}
            className={fechaActiva ? "text-amber-600" : "text-muted-foreground"}
          />
        </div>

        <div className="flex-1 min-w-0">
          {fechaActiva ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 rounded-full uppercase tracking-wide border border-amber-300 dark:border-amber-700">
                  <AlertTriangle size={11} />
                  Fuera de Plazo
                </span>
              </div>
              <p className="text-base font-bold text-foreground mt-1">
                {formatFechaLarga(fechaActiva)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Registrando partes diarios con fecha anterior al plazo vigente
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">
                Registro de Check-in y Check-out Fuera de Plazo
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecciona una fecha de la tabla para comenzar a registrar partes
              </p>
            </>
          )}
        </div>

        {/* Botón para limpiar la fecha activa */}
        {fechaActiva && (
          <button
            onClick={() => { setFechaActiva(null); setShowWizard(false); }}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            title="Cerrar sesión de fecha"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Sección Check-in / Check-out (visible sólo con fecha activa) ──── */}
      {fechaActiva && (
        <div className="space-y-6 animate-fade-in">
          {/* Cabecera de la sección */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground capitalize">
                {formatFechaLarga(fechaActiva)}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Check-in · Check-out · Partes Diarios
              </p>
            </div>
            {!showWizard && (
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus size={16} />
                Nuevo Check-in
              </button>
            )}
          </div>

          {/* Wizard de check-in inline */}
          {showWizard && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Registrar nuevo ingreso
                </h2>
                <button
                  onClick={() => setShowWizard(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <CheckinWizard
                fechaInicial={fechaActiva}
                onClose={() => setShowWizard(false)}
              />
            </div>
          )}

          {/* Tabla de huéspedes activos */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Huéspedes activos
            </h2>
            <ActiveGuestsTable
              onCheckout={(parte) => setParteParaCheckout(parte)}
              fechaActiva={fechaActiva ?? undefined}
            />
          </section>

          {/* Historial de check-outs */}
          <CheckoutGuestsTable fecha={fechaActiva ?? undefined} />

          {/* Modal de checkout */}
          {parteParaCheckout && (
            <CheckoutModal
              parte={parteParaCheckout}
              onClose={() => setParteParaCheckout(null)}
            />
          )}
        </div>
      )}

      {/* ── Historial de partes diarios ───────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {/* Cabecera */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck size={16} className="text-muted-foreground" />
            <h3 className="font-semibold text-foreground text-sm">
              Historial de Partes Diarios
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {isLoading ? "Cargando..." : `${historial.filter((f) => f.estado === "Abierto").length} pendiente${historial.filter((f) => f.estado === "Abierto").length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
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
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    No hay partes diarios registrados.
                  </td>
                </tr>
              ) : historial.map((fila) => {
                const esActiva = fechaActiva === fila.fecha;
                return (
                  <tr
                    key={fila.id}
                    className={cn(
                      "transition-colors",
                      esActiva
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-muted/20"
                    )}
                  >
                    {/* Fecha */}
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {formatFechaCorta(fila.fecha)}
                      {esActiva && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          activa
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      {fila.estado === "Abierto" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Abierto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                          <Lock size={10} />
                          Cerrado
                        </span>
                      )}
                    </td>

                    {/* Check-in */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-sm text-foreground">
                        {fila.checkins}
                      </span>
                    </td>

                    {/* Check-out */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-sm text-foreground">
                        {fila.checkouts}
                      </span>
                    </td>

                    {/* Reportado por */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {fila.reportadoPor ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-foreground">
                            {fila.reportadoPor.includes("-") ? (
                              <span className="font-mono">{fila.reportadoPor.slice(0, 8)}…</span>
                            ) : `@${fila.reportadoPor}`}
                          </span>
                          {fila.reportadoPorNombre && (
                            <span className="text-xs text-muted-foreground">{fila.reportadoPorNombre}</span>
                          )}
                        </div>
                      ) : "—"}
                    </td>

                    {/* Fecha y hora */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs font-mono">
                      {fila.fechaHora ? formatFechaHora(fila.fechaHora) : "—"}
                    </td>

                    {/* Condición */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          fila.condicion === "DENTRO_PLAZO"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        )}
                      >
                        {fila.condicion === "DENTRO_PLAZO"
                          ? "En Plazo"
                          : "Fuera Plazo"}
                      </span>
                    </td>

                    {/* Acción */}
                    <td className="px-4 py-3">
                      {fila.estado === "Abierto" && (
                        <button
                          onClick={() => handleRegistrar(fila.fecha)}
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                            esActiva
                              ? "text-primary border-primary/50 bg-primary/5 cursor-default"
                              : "text-primary border-primary/30 hover:border-primary hover:bg-primary/5"
                          )}
                          disabled={esActiva}
                        >
                          <AlertTriangle size={12} />
                          {esActiva ? "Registrando…" : "Registrar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}
