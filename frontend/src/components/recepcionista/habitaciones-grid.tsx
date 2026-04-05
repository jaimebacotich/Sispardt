"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BedDouble, User, Wrench, CheckCircle } from "lucide-react";
import { useHabitacionesEstado, useUpdateHabitacionEstado } from "@/hooks/useMovimientos";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmModal } from "@/components/shared";
import Link from "next/link";

const ESTADO_CONFIG = {
  libre: {
    label: "Libre",
    cardClass: "bg-status-libre/10 border-status-libre/30 hover:bg-status-libre/20 cursor-pointer",
    headerClass: "bg-status-libre/20 text-status-libre",
    dot: "bg-status-libre",
  },
  ocupada: {
    label: "Ocupada",
    cardClass: "bg-status-ocupada/10 border-status-ocupada/30",
    headerClass: "bg-status-ocupada/20 text-status-ocupada",
    dot: "bg-status-ocupada",
  },
  mantenimiento: {
    label: "Mantenimiento",
    cardClass: "bg-status-mantenimiento/10 border-status-mantenimiento/30 hover:bg-status-mantenimiento/20 cursor-pointer",
    headerClass: "bg-status-mantenimiento/20 text-status-mantenimiento",
    dot: "bg-status-mantenimiento",
  },
};

export function HabitacionesGrid() {
  const [pisoFiltro, setPisoFiltro] = useState<string | null>(null);
  const [pendingEstado, setPendingEstado] = useState<{ habId: string; numero: string; estado: "DISPONIBLE" | "MANTENIMIENTO" } | null>(null);
  const { data: habitaciones = [], isLoading } = useHabitacionesEstado();
  const { mutate: updateEstado, isPending: isUpdating } = useUpdateHabitacionEstado();

  const pisos = Array.from(new Set(habitaciones.map((h) => h.piso))).sort();
  const filtradas = pisoFiltro
    ? habitaciones.filter((h) => h.piso === pisoFiltro)
    : habitaciones;

  const stats = {
    libres: habitaciones.filter((h) => h.estado === "libre" && h.ocupacionActual === 0).length,
    ocupadas: habitaciones.filter((h) => h.estado === "ocupada" || h.ocupacionActual > 0).length,
    mantenimiento: habitaciones.filter((h) => h.estado === "mantenimiento").length,
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <Skeleton className="h-9 w-full rounded-none" />
            <div className="px-3 py-2.5 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen + leyenda */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-status-libre" />
          <span className="text-muted-foreground">Libre ({stats.libres})</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-status-ocupada" />
          <span className="text-muted-foreground">Ocupada ({stats.ocupadas})</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-status-mantenimiento" />
          <span className="text-muted-foreground">Mantenimiento ({stats.mantenimiento})</span>
        </div>

        {/* Filtro por piso */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Piso:</span>
          <button
            onClick={() => setPisoFiltro(null)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
              pisoFiltro === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:bg-muted"
            )}
          >
            Todos
          </button>
          {pisos.map((p) => (
            <button
              key={p}
              onClick={() => setPisoFiltro(p)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                pisoFiltro === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-muted"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Cuadrícula */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtradas.map((hab) => {
          const cfg = ESTADO_CONFIG[hab.estado];
          const isLibre = hab.estado === "libre";
          const isMantenimiento = hab.estado === "mantenimiento";
          return (
            <div
              key={hab.id}
              className={cn(
                "rounded-xl border overflow-hidden transition-all duration-150",
                cfg.cardClass,
                (isLibre || isMantenimiento) && "group"
              )}
            >
              {/* Header */}
              <div className={cn("px-3 py-2 flex items-center justify-between", cfg.headerClass)}>
                <span className="font-bold text-sm">Hab. {hab.numero}</span>
                <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
              </div>

              {/* Contenido */}
              <div className="px-3 py-2.5">
                <div className="text-xs text-muted-foreground">{hab.tipoNombre}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <BedDouble size={11} />
                  {hab.ocupacionActual > 0 ? (
                    <span className="font-medium text-amber-600">{hab.ocupacionActual}/{hab.capacidad}p</span>
                  ) : (
                    <span>{hab.capacidad}p</span>
                  )}
                </div>
                {hab.huespedes && hab.huespedes.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {hab.huespedes.map((nombre, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <User size={11} className="flex-shrink-0" />
                        <span className="truncate">{nombre}</span>
                      </div>
                    ))}
                  </div>
                )}

                {isLibre && (
                  <Link
                    href={`/partes/nuevo?habitacionId=${hab.id}`}
                    className="mt-2 w-full text-xs text-center block py-1 rounded-md bg-primary/80 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                  >
                    Check-in
                  </Link>
                )}

                {/* Botón mantenimiento / disponible */}
                {hab.estado !== "ocupada" && hab.ocupacionActual === 0 && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => setPendingEstado({
                      habId: hab.id,
                      numero: hab.numero,
                      estado: hab.estado === "mantenimiento" ? "DISPONIBLE" : "MANTENIMIENTO",
                    })}
                    className={cn(
                      "mt-2 w-full text-xs text-center flex items-center justify-center gap-1 py-1 rounded-md font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                      hab.estado === "mantenimiento"
                        ? "bg-status-libre/20 text-status-libre hover:bg-status-libre/30"
                        : "bg-status-mantenimiento/80 text-white hover:bg-status-mantenimiento opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {hab.estado === "mantenimiento" ? (
                      <><CheckCircle size={11} /> Marcar disponible</>
                    ) : (
                      <><Wrench size={11} /> Mantenimiento</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={!!pendingEstado}
        onClose={() => setPendingEstado(null)}
        onConfirm={() => {
          if (!pendingEstado) return;
          updateEstado({ habId: pendingEstado.habId, estado: pendingEstado.estado });
          setPendingEstado(null);
        }}
        title={pendingEstado?.estado === "MANTENIMIENTO" ? "Poner en mantenimiento" : "Marcar como disponible"}
        description={
          pendingEstado?.estado === "MANTENIMIENTO"
            ? `¿Confirmas que la Hab. ${pendingEstado?.numero} entrará en mantenimiento? No se podrán realizar check-ins hasta que sea habilitada nuevamente.`
            : `¿Confirmas que la Hab. ${pendingEstado?.numero} vuelve a estar disponible?`
        }
        confirmLabel={pendingEstado?.estado === "MANTENIMIENTO" ? "Poner en mantenimiento" : "Marcar disponible"}
        variant={pendingEstado?.estado === "MANTENIMIENTO" ? "destructive" : "default"}
        isLoading={isUpdating}
      />
    </div>
  );
}
