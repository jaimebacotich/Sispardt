"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { CheckinWizard } from "@/components/recepcionista/checkin-wizard";
import { ActiveGuestsTable } from "@/components/recepcionista/active-guests-table";
import { CheckoutGuestsTable } from "@/components/recepcionista/checkout-guests-table";
import { CheckoutModal } from "@/components/recepcionista/checkout-modal";
import { useFechaCierreActual } from "@/hooks/useMovimientos";
import type { ParteDiario } from "@/types/api";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function formatFechaISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  const dia = DIAS[fecha.getDay()];
  return `${dia}, ${d} de ${MESES[m - 1]} de ${y}`;
}

export default function PartesPage() {
  const { data: fechaServer } = useFechaCierreActual();
  const fechaHoy = fechaServer?.fechaHoy ?? new Date().toISOString().slice(0, 10);
  const [showWizard, setShowWizard] = useState(false);
  const [parteParaCheckout, setParteParaCheckout] = useState<ParteDiario | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Cabecera ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground capitalize">
            {formatFechaISO(fechaHoy)}
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

      {/* ── Wizard de check-in (inline, colapsable) ───────────── */}
      {showWizard && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Registrar nuevo ingreso</h2>
            <button
              onClick={() => setShowWizard(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <CheckinWizard onClose={() => setShowWizard(false)} />
        </div>
      )}

      {/* ── Tabla huéspedes activos ────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Huéspedes activos
        </h2>
        <ActiveGuestsTable onCheckout={(parte) => setParteParaCheckout(parte)} />
      </section>

      {/* ── Historial de check-outs (colapsable) ──────────────── */}
      <CheckoutGuestsTable />

      {/* ── Modal de checkout ──────────────────────────────────── */}
      {parteParaCheckout && (
        <CheckoutModal
          parte={parteParaCheckout}
          onClose={() => setParteParaCheckout(null)}
        />
      )}
    </div>
  );
}
