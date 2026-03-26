"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { CheckinWizard } from "@/components/recepcionista/checkin-wizard";
import { ActiveGuestsTable } from "@/components/recepcionista/active-guests-table";
import { CheckoutGuestsTable } from "@/components/recepcionista/checkout-guests-table";
import { CheckoutModal } from "@/components/recepcionista/checkout-modal";
import type { ParteDiario } from "@/types/api";

// Fecha en español —  ej: "Domingo, 8 de marzo de 2026"
function formatFechaEspanol(fecha: Date): string {
  return fecha.toLocaleDateString("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PartesPage() {
  const hoy = new Date();
  const [showWizard, setShowWizard] = useState(false);
  const [parteParaCheckout, setParteParaCheckout] = useState<ParteDiario | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Cabecera ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground capitalize">
            {formatFechaEspanol(hoy)}
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
