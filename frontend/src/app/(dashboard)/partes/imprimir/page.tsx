"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { FechaModal } from "./_components/FechaModal";
import { PreviewModal } from "./_components/PreviewModal";
import { useReportePDF } from "@/hooks/useMovimientos";
import { useEstablecimientoActual } from "@/hooks/useEstablecimientoActual";

export default function ImprimirPartePage() {
  const router = useRouter();
  const { nombre: nombreEstablecimiento, isLoading: loadingEstab } = useEstablecimientoActual();

  const [fechaRaw, setFechaRaw] = useState<string | null>(null);   // YYYY-MM-DD
  const [pdfUrl, setPdfUrl]     = useState<string | null>(null);

  const { data: blobUrl, isFetching, isError } = useReportePDF(
    fechaRaw,
    nombreEstablecimiento ?? ""
  );

  // Cuando llega el blob URL, mostrar el preview
  useEffect(() => {
    if (blobUrl && !isFetching) {
      setPdfUrl(blobUrl);
    }
  }, [blobUrl, isFetching]);

  // Error al obtener el PDF
  useEffect(() => {
    if (isError && fechaRaw) {
      toast.error("No se pudo generar el reporte. Intenta nuevamente.");
      setFechaRaw(null);
    }
  }, [isError, fechaRaw]);

  function handleGenerar(fecha: string) {
    // Liberar blob URL anterior si existe
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setFechaRaw(fecha);
  }

  function handleCerrar() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setFechaRaw(null);
    router.back();
  }

  // Formatear fecha para mostrar: YYYY-MM-DD → DD/MM/YYYY
  const fechaDisplay = fechaRaw
    ? format(new Date(fechaRaw + "T12:00:00"), "dd/MM/yyyy")
    : "";

  return (
    <>
      {/* Spinner mientras carga el PDF */}
      {(isFetching || loadingEstab) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl px-8 py-6 shadow-xl flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-700">Generando reporte…</p>
          </div>
        </div>
      )}

      {/* Modal selector de fecha */}
      {!pdfUrl && !isFetching && (
        <FechaModal onGenerar={handleGenerar} />
      )}

      {/* Preview del PDF */}
      {pdfUrl && fechaRaw && (
        <PreviewModal
          pdfUrl={pdfUrl}
          fecha={fechaDisplay}
          fechaRaw={fechaRaw}
          nombreEstablecimiento={nombreEstablecimiento ?? "Establecimiento"}
          onCerrar={handleCerrar}
        />
      )}
    </>
  );
}
