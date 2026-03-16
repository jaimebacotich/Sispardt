"use client";

import { CierrePanel } from "@/components/recepcionista/cierre-panel";
import { CierreHistorial } from "@/components/recepcionista/cierre-historial";

/** Calcula la fecha de ayer en formato "YYYY-MM-DD" */
function getFechaAyer(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function CierreActualClient() {
  const fechaAyer = getFechaAyer();

  return (
    <div className="space-y-6">
      <CierrePanel fecha={fechaAyer} modo="actual" />
      <CierreHistorial />
    </div>
  );
}
