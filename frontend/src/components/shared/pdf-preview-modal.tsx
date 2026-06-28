"use client";

import { useRef } from "react";
import { X, Download, Printer, FileSpreadsheet } from "lucide-react";

interface Props {
  pdfUrl: string;
  titulo: string;
  subtitulo?: string;
  nombreArchivo: string;
  onCerrar: () => void;
}

export function PdfPreviewModal({ pdfUrl, titulo, subtitulo, nombreArchivo, onCerrar }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function handleImprimir() {
    iframeRef.current?.contentWindow?.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
      <div className="bg-white flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 shrink-0">
          <div>
            <p className="font-semibold text-gray-800 text-sm">{titulo}</p>
            {subtitulo && <p className="text-xs text-gray-500">{subtitulo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              download={nombreArchivo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </a>

            <button
              onClick={() => {}}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </button>

            <button
              onClick={handleImprimir}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>

            <button
              onClick={onCerrar}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <iframe
          ref={iframeRef}
          src={pdfUrl}
          className="flex-1 w-full border-0"
          title={titulo}
        />
      </div>
    </div>
  );
}
