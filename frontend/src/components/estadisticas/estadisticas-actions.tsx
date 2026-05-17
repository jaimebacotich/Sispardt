"use client";

import { useState } from "react";
import { Printer, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function EstadisticasActions() {
  const [exportando, setExportando] = useState(false);

  // ── Imprimir ─────────────────────────────────────────────────────────────
  function handleImprimir() {
    window.print();
  }

  // ── Exportar PDF con html2canvas + jsPDF ─────────────────────────────────
  async function handleExportarPDF() {
    // Capturamos el wrapper completo (incluye encabezado + dashboard, excluye botones via print:hidden)
    const contenido = document.getElementById("estadisticas-export-wrapper") ??
                      document.getElementById("estadisticas-contenido");
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

      const canvas = await html2canvas(contenido, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        // Fondo blanco explícito — las variables CSS de Tailwind no se resuelven bien
        backgroundColor: "#ffffff",
        imageTimeout: 0,
        ignoreElements: (el) =>
          el.classList.contains("print:hidden") ||
          el.getAttribute("data-html2canvas-ignore") === "true",
        onclone: (_doc, element) => {
          // Forzar fondo blanco en el clon para que los bg-card/bg-background
          // con variables CSS queden opacos en la captura
          element.style.backgroundColor = "#ffffff";
          element.style.color = "#111111";
          element.querySelectorAll<HTMLElement>("*").forEach((el) => {
            const bg = window.getComputedStyle(el).backgroundColor;
            // Reemplazar fondos transparentes por blanco
            if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
              el.style.backgroundColor = "#ffffff";
            }
          });
        },
      });

      const imgW = canvas.width / 2;   // escala 2 → tamaño real en px
      const imgH = canvas.height / 2;

      // Margen en px (en el espacio del documento)
      const margin = 24;

      const pdf = new jsPDF({
        orientation: imgW > imgH ? "landscape" : "portrait",
        unit: "px",
        format: [imgW + margin * 2, imgH + margin * 2],
      });

      // Fondo blanco del PDF
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, imgW + margin * 2, imgH + margin * 2, "F");

      // Imagen desplazada por el margen
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        margin, margin, imgW, imgH
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

    </div>
  );
}
