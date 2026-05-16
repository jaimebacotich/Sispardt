"use client";

import { useState } from "react";
import { Printer, FileDown, Loader2 } from "lucide-react";
import { ExportButtons } from "@/components/shared";
import { toast } from "sonner";

export function EstadisticasActions() {
  const [exportando, setExportando] = useState(false);

  // ── Imprimir ─────────────────────────────────────────────────────────────
  function handleImprimir() {
    window.print();
  }

  // ── Exportar PDF con html2canvas + jsPDF ─────────────────────────────────
  async function handleExportarPDF() {
    const contenido = document.getElementById("estadisticas-contenido");
    if (!contenido) {
      toast.error("No se encontró el contenido del dashboard.");
      return;
    }

    setExportando(true);
    toast.info("Generando PDF, un momento…");

    try {
      // Importación dinámica — no aumenta el bundle inicial
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const bgColor =
        window.getComputedStyle(document.body).backgroundColor || "#ffffff";

      const canvas = await html2canvas(contenido, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: bgColor,
        ignoreElements: (el) =>
          el.classList.contains("print:hidden") ||
          el.getAttribute("data-html2canvas-ignore") === "true",
      });

      const imgW = canvas.width / 2;   // escala 2 → tamaño real en px
      const imgH = canvas.height / 2;

      const pdf = new jsPDF({
        orientation: imgW > imgH ? "landscape" : "portrait",
        unit: "px",
        format: [imgW, imgH],
      });

      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0, 0, imgW, imgH
      );

      const fecha = new Date().toISOString().slice(0, 10);
      pdf.save(`estadisticas-sispardt-${fecha}.pdf`);
      toast.success("PDF generado correctamente.");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el PDF.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      {/* Imprimir — usa window.print() con CSS @media print */}
      <button
        onClick={handleImprimir}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition-colors"
      >
        <Printer size={13} />
        Imprimir
      </button>

      {/* Exportar PDF — descarga el archivo directamente */}
      <button
        onClick={handleExportarPDF}
        disabled={exportando}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {exportando ? (
          <><Loader2 size={13} className="animate-spin" />Generando…</>
        ) : (
          <><FileDown size={13} />Exportar PDF</>
        )}
      </button>

      {/* Botón Excel — próximamente */}
      <ExportButtons
        onExcel={() => toast.info("Exportación Excel próximamente")}
      />
    </div>
  );
}
