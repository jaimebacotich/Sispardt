"use client";

import { useState } from "react";
import { Search, LogOut, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ConfirmModal } from "@/components/shared";
import { usePartes, useAnularParte } from "@/hooks/useMovimientos";
import type { ParteDiario } from "@/types/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

interface ActiveGuestsTableProps {
  onCheckout: (parte: ParteDiario) => void;
  /** Cuando se provee, filtra huéspedes activos en esa fecha histórica */
  fechaActiva?: string;
}

export function ActiveGuestsTable({ onCheckout, fechaActiva }: ActiveGuestsTableProps) {
  // Para fecha histórica: huéspedes con fecha_reporte <= fechaActiva y sin salida ese día
  // Para fecha actual: todos los activos + anulados
  const queryParams = fechaActiva
    ? { activoEnFecha: fechaActiva, soloActivos: true, pageSize: 500 }
    : { incluirAnulados: true };
  const { data: partesRaw, isLoading, error } = usePartes(queryParams);
  const anularMutation = useAnularParte();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [anularId, setAnularId] = useState<string | null>(null);

  const allPartes = Array.isArray(partesRaw) ? partesRaw : (partesRaw as { data?: ParteDiario[] })?.data ?? [];
  const partes = fechaActiva
    ? allPartes  // backend ya filtró activos en esa fecha
    : allPartes.filter((p) => p.salidaAt === null || p.estadoOperativo === "ANULADO");

  const filtered = partes.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.persona.nombre.toLowerCase().includes(q) ||
      p.persona.apellidoPaterno.toLowerCase().includes(q) ||
      (p.persona.apellidoMaterno ?? "").toLowerCase().includes(q) ||
      p.persona.documentoIdentidad.toLowerCase().includes(q) ||
      p.habNroSnapshot.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handleAnular() {
    if (!anularId) return;
    anularMutation.mutate(anularId, {
      onSuccess: () => setAnularId(null),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive text-sm">
        Error al cargar huéspedes activos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 h-9 text-sm"
          placeholder="Buscar por nombre, documento, hab..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hab.</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Huésped</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documento</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Procedencia</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ingreso</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cond.</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                  {search ? "Sin resultados para la búsqueda." : "No hay huéspedes activos."}
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {p.habNroSnapshot}
                    <div className="text-xs text-muted-foreground font-normal">Piso {p.habPisoSnapshot}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {p.persona.nombre} {p.persona.apellidoPaterno}
                      {p.persona.apellidoMaterno ? ` ${p.persona.apellidoMaterno}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.persona.paisOrigenNombre}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="font-mono text-xs bg-muted rounded px-1.5 py-0.5">
                      {p.persona.tipoDocumentoSigla}
                    </span>{" "}
                    {p.persona.documentoIdentidad}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.paisProcedenciaNombre}
                    {p.localidadProcedenciaNombre && (
                      <div className="text-xs">{p.localidadProcedenciaNombre}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(p.ingresoAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      p.condicionEntrega === "DENTRO_PLAZO"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    )}>
                      {p.condicionEntrega === "DENTRO_PLAZO" ? "En Plazo" : "Fuera Plazo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      p.estadoOperativo === "ACTIVO"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    )}>
                      {p.estadoOperativo === "ACTIVO" ? "Activo" : "Anulado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.estadoOperativo === "ACTIVO" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onCheckout(p)}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 border border-primary/30 hover:border-primary/60 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <LogOut size={13} />
                          Check-out
                        </button>
                        <button
                          onClick={() => setAnularId(p.id)}
                          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive border border-border hover:border-destructive/50 px-2.5 py-1.5 rounded-lg transition-colors"
                          title="Eliminar parte"
                        >
                          <Trash2 size={13} />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} registros</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!anularId}
        onClose={() => setAnularId(null)}
        onConfirm={handleAnular}
        title="Anular el Check-in"
        description="¿Confirmas que deseas anular el Check-in de esta persona? Esta acción quedará registrada en auditoría."
        confirmLabel="Anular"
        cancelLabel="Cancelar"
        variant="destructive"
        isLoading={anularMutation.isPending}
      />
    </div>
  );
}

function formatDateTime(iso: string): React.ReactNode {
  try {
    const d = new Date(iso);
    return (
      <>
        <span>{d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
        <div className="text-xs">{d.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</div>
      </>
    );
  } catch {
    return iso;
  }
}
