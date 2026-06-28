"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LogIn,
  LogOut,
  Users,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCierrePorFecha,
  useCreateCierre,
  usePreviewCierre,
} from "@/hooks/useMovimientos";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/* ────────────────────────────────────────────────────────────
 * Helpers de fecha
 * ──────────────────────────────────────────────────────────── */

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
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

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-BO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ────────────────────────────────────────────────────────────
 * Subcomponente: KPI Card
 * ──────────────────────────────────────────────────────────── */

function KpiCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 text-center">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2", colorClass)}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Subcomponente: Diálogo Declaración Jurada (overlay prominente)
 * ──────────────────────────────────────────────────────────── */

function DjDialog({
  fechaLabel,
  onConfirmar,
  onCancelar,
  isLoading,
}: {
  fechaLabel: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
            <ShieldAlert size={24} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Confirmación de Cierre</h2>
            <p className="text-xs text-muted-foreground">Acción irreversible</p>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            ⚠ Declaración Jurada
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            Cerrar el parte diario del{" "}
            <strong>{fechaLabel}</strong> tiene carácter de{" "}
            <strong>Declaración Jurada</strong>. Luego de confirmar el cierre{" "}
            no podrá realizar modificaciones a esa fecha.
          </p>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            ¿Desea continuar?
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Confirmar Cierre
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Subcomponente: Diálogo Sin Movimiento
 * ──────────────────────────────────────────────────────────── */

function SinMovDialog({
  fechaLabel,
  onConfirmar,
  onCancelar,
  isLoading,
}: {
  fechaLabel: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Sin registros de huéspedes</h2>
            <p className="text-xs text-muted-foreground">{fechaLabel}</p>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            No tiene registro de huéspedes para el <strong>{fechaLabel}</strong>.
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            Si continúa, el cierre quedará registrado con observación{" "}
            <strong>&quot;Sin Movimiento&quot;</strong>. El cierre es obligatorio incluso sin movimientos.
          </p>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            ¿Desea continuar?
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Continuar de todas formas
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Componente principal: CierrePanel
 * ──────────────────────────────────────────────────────────── */

interface CierrePanelProps {
  /** Fecha ISO "2026-03-08" */
  fecha: string;
  modo: "actual" | "fuera-de-plazo";
  onCierreDone?: () => void;
}

type DialogState = null | "dj" | "sinmov";

export function CierrePanel({ fecha, modo, onCierreDone }: CierrePanelProps) {
  const [observaciones, setObservaciones] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);

  const { data: cierreExistente, isLoading: loadingCierre } = useCierrePorFecha(fecha);
  const { data: preview } = usePreviewCierre(fecha);
  const cierreMutation = useCreateCierre();

  const yaCerrado      = !!cierreExistente;
  const totalCheckins  = yaCerrado ? (cierreExistente?.totalCheckins ?? 0) : (preview?.totalCheckins ?? 0);
  const totalCheckouts = yaCerrado ? (cierreExistente?.totalCheckouts ?? 0) : (preview?.totalCheckouts ?? 0);
  const huespedes      = preview?.huespedes ?? 0;
  const esFueraPlazo   = modo === "fuera-de-plazo";
  const fechaLabel     = formatFechaLarga(fecha);

  /* ── Flujo de confirmación ── */
  function handleConfirmarClick() {
    setDialog("dj");
  }

  function handleDjConfirmar() {
    setDialog(null);
    if (totalCheckins === 0) {
      setDialog("sinmov");
    } else {
      ejecutarCierre(observaciones);
    }
  }

  function handleSinMovConfirmar() {
    setDialog(null);
    const obs = observaciones.trim() || "Sin Movimiento";
    setObservaciones(obs);
    ejecutarCierre(obs);
  }

  function ejecutarCierre(obs: string) {
    cierreMutation.mutate(
      { fechaReporte: fecha, observacion: obs.trim() || undefined },
      { onSuccess: () => onCierreDone?.() }
    );
  }

  if (loadingCierre) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Encabezado fecha ── */}
      <div
        className={cn(
          "bg-card rounded-xl border p-5",
          esFueraPlazo
            ? "border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/20"
            : "border-border"
        )}
      >
        {esFueraPlazo && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 px-2.5 py-1 rounded-full mb-3 uppercase tracking-wide">
            <AlertTriangle size={12} />
            Cierre Fuera de Plazo
          </span>
        )}
        <p className="text-sm text-muted-foreground leading-none mb-1">Parte diario:</p>
        <p className="text-xl font-bold text-foreground">{fechaLabel}</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          icon={<LogIn size={18} className="text-primary" />}
          label="Check-in"
          value={totalCheckins}
          colorClass="bg-primary/10"
        />
        <KpiCard
          icon={<LogOut size={18} className="text-chart-3" />}
          label="Check-out"
          value={totalCheckouts}
          colorClass="bg-chart-3/10"
        />
        <KpiCard
          icon={<Users size={18} className="text-status-ocupada" />}
          label="Huéspedes"
          value={huespedes}
          colorClass="bg-status-ocupada/10"
        />
        {/* Estado badge */}
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <div className="text-xs text-muted-foreground mb-2">Estado</div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide",
              yaCerrado
                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            )}
          >
            {yaCerrado ? <Lock size={12} /> : <CheckCircle2 size={12} />}
            {yaCerrado ? "Cerrado" : "Abierto"}
          </span>
        </div>
      </div>

      {/* ── Observaciones ── */}
      {yaCerrado ? (
        cierreExistente?.observacion && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Observaciones registradas
            </p>
            <p className="text-sm text-foreground">{cierreExistente.observacion}</p>
          </div>
        )
      ) : (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <label className="text-sm font-medium text-foreground">
            Observaciones{" "}
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </label>
          <textarea
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring dark:bg-input/30"
            rows={3}
            placeholder="Observaciones del parte diario..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>
      )}

      {/* ── Aviso declaración jurada ── */}
      {!yaCerrado && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            <span className="font-semibold">
              Cerrar un parte diario tiene carácter de declaración jurada.
            </span>{" "}
            Una vez realizado ya no se podrá realizar cambios de esa fecha. Cerrar un parte
            diario es obligatorio incluso si no hay movimientos de check-in o check-out.
          </p>
        </div>
      )}

      {/* ── Botón / Estado cerrado ── */}
      {!yaCerrado ? (
        <div className="flex justify-center">
          <button
            onClick={handleConfirmarClick}
            disabled={cierreMutation.isPending}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors shadow-md disabled:opacity-60"
          >
            <CheckCircle2 size={16} />
            Confirmar Cierre
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 font-medium text-sm">
          <Lock size={16} />
          Cierre realizado el{" "}
          {cierreExistente?.cerradoAt ? formatFechaHora(cierreExistente.cerradoAt) : "—"}
        </div>
      )}

      {/* ── Diálogos ── */}
      {dialog === "dj" && (
        <DjDialog
          fechaLabel={fechaLabel}
          onConfirmar={handleDjConfirmar}
          onCancelar={() => setDialog(null)}
          isLoading={cierreMutation.isPending}
        />
      )}
      {dialog === "sinmov" && (
        <SinMovDialog
          fechaLabel={fechaLabel}
          onConfirmar={handleSinMovConfirmar}
          onCancelar={() => setDialog(null)}
          isLoading={cierreMutation.isPending}
        />
      )}
    </div>
  );
}
