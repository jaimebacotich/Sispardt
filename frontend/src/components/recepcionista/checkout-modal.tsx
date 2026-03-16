"use client";

import { LogOut, X } from "lucide-react";
import { useCheckout } from "@/hooks/useMovimientos";
import type { ParteDiario } from "@/types/api";

interface CheckoutModalProps {
  parte: ParteDiario;
  onClose: () => void;
}

export function CheckoutModal({ parte, onClose }: CheckoutModalProps) {
  const checkout = useCheckout();

  function handleConfirm() {
    checkout.mutate(parte.id, {
      onSuccess: onClose,
    });
  }

  const nombre = `${parte.persona.nombre} ${parte.persona.apellidoPaterno}${
    parte.persona.apellidoMaterno ? ` ${parte.persona.apellidoMaterno}` : ""
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <LogOut size={18} className="text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Confirmar Check-out</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            ¿Confirma la salida del huésped? Se registrará la hora del servidor automáticamente.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <Row label="Habitación" value={`Hab. ${parte.habNroSnapshot} — Piso ${parte.habPisoSnapshot}`} />
            <Row label="Huésped" value={nombre} />
            <Row
              label="Documento"
              value={`${parte.persona.tipoDocumentoSigla}: ${parte.persona.documentoIdentidad}`}
            />
            <Row
              label="Ingreso"
              value={new Date(parte.ingresoAt).toLocaleString("es-BO", {
                day: "2-digit", month: "2-digit", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            La habitación quedará disponible inmediatamente tras el check-out.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <button
            onClick={onClose}
            disabled={checkout.isPending}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={checkout.isPending}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            <LogOut size={15} />
            {checkout.isPending ? "Procesando..." : "Confirmar Check-out"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
