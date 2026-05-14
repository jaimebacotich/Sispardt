"use client";

import dynamic from "next/dynamic";
import { X, Download, Printer } from "lucide-react";
import type { ReporteParteDiario } from "@/types/api";
import { ParteDiarioPDF } from "@/components/reportes/ParteDiarioPDF";
import { PDFDownloadLink } from "@react-pdf/renderer";

// PDFViewer solo funciona en el cliente (usa iframe + canvas)
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Cargando vista previa…</div> }
);

interface Props {
  data: ReporteParteDiario;
  nombreEstablecimiento: string;
  onCerrar: () => void;
}

export function PreviewModal({ data, nombreEstablecimiento, onCerrar }: Props) {
  const nombreArchivo = `parte-diario-${data.fecha.replace(/\//g, "-")}.pdf`;
  const doc = <ParteDiarioPDF data={data} nombreEstablecimiento={nombreEstablecimiento} />;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
      <div className="bg-white flex flex-col flex-1 overflow-hidden rounded-t-none">
        {/* Barra superior */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 shrink-0">
          <div>
            <p className="font-semibold text-gray-800 text-sm">Vista previa — Parte Diario {data.fecha}</p>
            <p className="text-xs text-gray-500">{nombreEstablecimiento}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Descargar */}
            <PDFDownloadLink document={doc} fileName={nombreArchivo}>
              {({ loading }) => (
                <button
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {loading ? "Preparando…" : "Descargar PDF"}
                </button>
              )}
            </PDFDownloadLink>

            {/* Imprimir (usa el botón nativo del iframe del PDFViewer) */}
            <button
              onClick={() => {
                const iframe = document.querySelector<HTMLIFrameElement>("iframe[title='pdf-preview']");
                iframe?.contentWindow?.print();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>

            {/* Cerrar */}
            <button
              onClick={onCerrar}
              className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Visor PDF */}
        <div className="flex-1 overflow-hidden">
          <PDFViewer
            width="100%"
            height="100%"
            showToolbar={false}
            // @ts-expect-error prop no tipada en v4
            title="pdf-preview"
          >
            {doc}
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}
