"use client";

import { CierrePanel } from "@/components/recepcionista/cierre-panel";
import { CierreHistorial } from "@/components/recepcionista/cierre-historial";
import { useFechaCierreActual } from "@/hooks/useMovimientos";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CalendarX2 } from "lucide-react";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatFechaLegible(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

export function CierreActualClient() {
  const { data, isLoading } = useFechaCierreActual();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const fechaCierre = data?.fechaCierre;
  const fechaInicio = data?.fechaInicioOperaciones;

  if (!fechaCierre) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center space-y-2">
        <CalendarX2 className="h-8 w-8 text-amber-600 mx-auto" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          No se pudo obtener la fecha de cierre desde el servidor.
        </p>
      </div>
    );
  }

  if (fechaInicio && fechaCierre < fechaInicio) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center space-y-2">
          <CalendarX2 className="h-8 w-8 text-blue-600 mx-auto" />
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            No hay parte diario que cerrar
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            El establecimiento inició operaciones el{" "}
            <strong>{formatFechaLegible(fechaInicio)}</strong>.
            No existen partes diarios anteriores a esa fecha.
          </p>
        </div>
        <CierreHistorial />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CierrePanel fecha={fechaCierre} modo="actual" />
      <CierreHistorial />
    </div>
  );
}
