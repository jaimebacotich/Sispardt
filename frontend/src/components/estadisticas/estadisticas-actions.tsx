"use client";

import { Printer } from "lucide-react";
import { toast } from "sonner";
import { ExportButtons } from "@/components/shared";

export function EstadisticasActions() {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        <Printer size={13} />
        Imprimir
      </button>
      <ExportButtons
        onPDF={() => toast.info("Exportación PDF próximamente")}
        onExcel={() => toast.info("Exportación Excel próximamente")}
      />
    </div>
  );
}
