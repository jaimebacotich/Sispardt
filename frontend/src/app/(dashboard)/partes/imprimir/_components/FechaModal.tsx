"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, Printer } from "lucide-react";

interface Props {
  onGenerar: (fecha: string) => void;
}

export function FechaModal({ onGenerar }: Props) {
  const router = useRouter();
  const hoy = format(new Date(), "yyyy-MM-dd");
  const [fecha, setFecha] = useState(hoy);

  function handleGenerar() {
    if (!fecha) return;
    onGenerar(fecha);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-5">
        {/* Título */}
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">
            Impresión de Parte Diario
          </h2>
        </div>

        {/* Selector de fecha */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700" htmlFor="fecha-reporte">
            Fecha del reporte
          </label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              id="fecha-reporte"
              type="date"
              value={fecha}
              max={hoy}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2 px-4 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGenerar}
            disabled={!fecha}
            className="flex-1 py-2 px-4 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generar Reporte
          </button>
        </div>
      </div>
    </div>
  );
}
