"use client";

import { useState } from "react";
import { DataTable, ConfirmModal } from "@/components/shared";
import type { Column } from "@/components/shared/data-table";
import type { ParteDiario } from "@/types/api";
import { usePartes, useAnularParte } from "@/hooks/useMovimientos";
import { formatDateTime } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PartesList() {
  const [anularId, setAnularId] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "anulados">("todos");

  const { data: raw, isLoading } = usePartes();
  const anularMutation = useAnularParte();

  const partes: ParteDiario[] = Array.isArray(raw) ? raw : (raw as { data?: ParteDiario[] })?.data ?? [];
  const filtrados = partes.filter((p) => {
    if (filtroEstado === "activos") return p.estadoOperativo === "ACTIVO" && p.salidaAt === null;
    if (filtroEstado === "anulados") return p.estadoOperativo === "ANULADO";
    return true;
  });

  function handleAnular() {
    if (!anularId) return;
    anularMutation.mutate(anularId, {
      onSuccess: () => setAnularId(null),
    });
  }

  const columns: Column<ParteDiario>[] = [
    {
      key: "hora",
      header: "Ingreso",
      cell: (p) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatDateTime(p.ingresoAt)}
        </span>
      ),
    },
    {
      key: "habitacion",
      header: "Habitación",
      cell: (p) => (
        <span className="bg-muted px-2 py-0.5 rounded text-xs font-medium text-foreground">
          Hab. {p.habNroSnapshot}
        </span>
      ),
    },
    {
      key: "huesped",
      header: "Huésped",
      cell: (p) => (
        <div>
          <div className="text-sm font-medium text-foreground">
            {p.persona.nombre} {p.persona.apellidoPaterno}
            {p.persona.apellidoMaterno ? ` ${p.persona.apellidoMaterno}` : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            {p.persona.tipoDocumentoSigla}: {p.persona.documentoIdentidad}
          </div>
        </div>
      ),
    },
    {
      key: "procedencia",
      header: "Procedencia",
      cell: (p) => <span className="text-sm">{p.paisProcedenciaNombre}</span>,
    },
    {
      key: "condicion",
      header: "Condición",
      cell: (p) => (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          p.condicionEntrega === "DENTRO_PLAZO"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
        )}>
          {p.condicionEntrega === "DENTRO_PLAZO" ? "En Plazo" : "Fuera Plazo"}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (p) => (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
          p.salidaAt !== null
            ? "bg-muted text-muted-foreground"
            : p.estadoOperativo === "ACTIVO"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-red-100 text-red-700"
        )}>
          {p.salidaAt !== null ? "Checkout" : p.estadoOperativo === "ACTIVO" ? "Activo" : "Anulado"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      cell: (p) =>
        p.estadoOperativo === "ACTIVO" && p.salidaAt === null ? (
          <button
            onClick={() => setAnularId(p.id)}
            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Anular parte"
          >
            <Trash2 size={15} />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2">
        {(["todos", "activos", "anulados"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltroEstado(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtroEstado === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f === "todos" ? "Todos" : f === "activos" ? "Activos" : "Anulados"}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtrados.length} partes
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filtrados}
        isLoading={isLoading}
        getRowKey={(p) => p.id}
        emptyMessage="No hay partes registrados para los filtros seleccionados."
      />

      <ConfirmModal
        open={!!anularId}
        onClose={() => setAnularId(null)}
        onConfirm={handleAnular}
        title="Anular parte diario"
        description="¿Confirmas que deseas anular este parte? Esta acción quedará registrada en auditoría."
        confirmLabel="Anular parte"
        cancelLabel="Cancelar"
        variant="destructive"
        isLoading={anularMutation.isPending}
      />
    </div>
  );
}
