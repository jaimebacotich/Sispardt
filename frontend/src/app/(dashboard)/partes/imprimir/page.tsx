"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FechaModal } from "./_components/FechaModal";
import { PreviewModal } from "./_components/PreviewModal";
import { useReportePartes } from "@/hooks/useMovimientos";
import { useEstablecimientoActual } from "@/hooks/useEstablecimientoActual";
import type { ReporteParteDiario } from "@/types/api";

export default function ImprimirPartePage() {
  const router = useRouter();
  const { nombre: nombreEstablecimiento } = useEstablecimientoActual();

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReporteParteDiario | null>(null);

  const { data, isFetching, isError } = useReportePartes(fechaSeleccionada);

  useEffect(() => {
    if (data && !isFetching) {
      setReporte(data);
    }
  }, [data, isFetching]);

  useEffect(() => {
    if (isError && fechaSeleccionada) {
      toast.error("No se pudo generar el reporte. Intenta nuevamente.");
      setFechaSeleccionada(null);
    }
  }, [isError, fechaSeleccionada]);

  function handleGenerar(fecha: string) {
    setReporte(null);
    setFechaSeleccionada(fecha);
  }

  function handleCerrarPreview() {
    setReporte(null);
    setFechaSeleccionada(null);
    router.back();
  }

  return (
    <>
      {/* Overlay de carga mientras se obtienen los datos */}
      {isFetching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl px-8 py-6 shadow-xl flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-700">Generando reporte…</p>
          </div>
        </div>
      )}

      {/* Modal selector de fecha */}
      {!reporte && !isFetching && (
        <FechaModal onGenerar={handleGenerar} />
      )}

      {/* Modal de preview PDF */}
      {reporte && (
        <PreviewModal
          data={reporte}
          nombreEstablecimiento={nombreEstablecimiento ?? "Establecimiento"}
          onCerrar={handleCerrarPreview}
        />
      )}
    </>
  );
}
