"use client";

import { Download } from "lucide-react";

interface ExportButtonsProps {
  onPDF?: () => void;
  onExcel?: () => void;
  onCSV?: () => void;
  isLoading?: boolean;
}

export function ExportButtons({ onPDF, onExcel, onCSV, isLoading }: ExportButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {onPDF && (
        <button
          onClick={onPDF}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors disabled:opacity-50"
        >
          <Download size={13} />
          PDF
        </button>
      )}
      {onExcel && (
        <button
          onClick={onExcel}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-status-libre/10 text-status-libre border border-status-libre/20 hover:bg-status-libre/20 transition-colors disabled:opacity-50"
        >
          <Download size={13} />
          Excel
        </button>
      )}
      {onCSV && (
        <button
          onClick={onCSV}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 transition-colors disabled:opacity-50"
        >
          <Download size={13} />
          CSV
        </button>
      )}
    </div>
  );
}
