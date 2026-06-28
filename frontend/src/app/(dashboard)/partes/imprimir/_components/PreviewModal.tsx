"use client";

import { PdfPreviewModal } from "@/components/shared";

interface Props {
  pdfUrl: string;
  fecha: string;
  fechaRaw: string;
  nombreEstablecimiento: string;
  onCerrar: () => void;
}

export function PreviewModal({ pdfUrl, fecha, fechaRaw, nombreEstablecimiento, onCerrar }: Props) {
  return (
    <PdfPreviewModal
      pdfUrl={pdfUrl}
      titulo={`Vista previa — Parte Diario ${fecha}`}
      subtitulo={nombreEstablecimiento}
      nombreArchivo={`parte-diario-${fechaRaw}.pdf`}
      onCerrar={onCerrar}
    />
  );
}
