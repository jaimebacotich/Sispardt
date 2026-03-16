"use client";

import { useState, useMemo } from "react";
import { Search, X, Calendar, ShieldCheck, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { FilterChips } from "@/components/shared/filter-chips";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { useAuditoriaSesiones } from "@/hooks/useAuditoriaSesiones";
import { useEstablecimientos } from "@/hooks/useEstablecimientos";
import type { SesionAuditoria } from "@/types/api";
import type { Column } from "@/components/shared/data-table";
import type { FilterChip } from "@/components/shared/filter-chips";

const PAGE_SIZE = 20;

type TipoEvento = "LOGIN" | "LOGOUT" | "LOGIN_ERROR";

const TIPO_CHIPS: FilterChip<TipoEvento>[] = [
  { value: "LOGIN",       label: "LOGIN",       activeClassName: "bg-status-libre text-white border-status-libre" },
  { value: "LOGOUT",      label: "LOGOUT",      activeClassName: "bg-orange-500 text-white border-orange-500" },
  { value: "LOGIN_ERROR", label: "LOGIN_ERROR",  activeClassName: "bg-status-ocupada text-white border-status-ocupada" },
];

const TIPO_COLORS: Record<TipoEvento, string> = {
  LOGIN:       "bg-status-libre/15 text-emerald-700 dark:text-emerald-400",
  LOGOUT:      "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  LOGIN_ERROR: "bg-status-ocupada/15 text-red-700 dark:text-red-400",
};

const ROLE_OPTIONS = [
  { value: "",                        label: "Todos los roles" },
  { value: "admin_general",           label: "Admin General" },
  { value: "responsable_registro",    label: "Resp. Registro" },
  { value: "tecnico_registro",        label: "Téc. Registro" },
  { value: "responsable_estadistica", label: "Resp. Estadística" },
  { value: "recepcionista",           label: "Recepcionista" },
];

const ROLE_LABELS: Record<string, string> = {
  admin_general:             "Admin General",
  responsable_registro:      "Resp. Registro",
  tecnico_registro:          "Téc. Registro",
  responsable_estadistica:   "Resp. Estadística",
  recepcionista:             "Recepcionista",
};

const NON_RECEPCIONISTA_ROLES = new Set([
  "admin_general",
  "responsable_registro",
  "tecnico_registro",
  "responsable_estadistica",
]);

export function AuditoriaSesionesView() {
  const [tipoFiltros, setTipoFiltros] = useState<TipoEvento[]>([]);
  const [username,    setUsername]    = useState("");
  const [rolFiltro,   setRolFiltro]   = useState("");
  const [fechaDesde,  setFechaDesde]  = useState("");
  const [fechaHasta,  setFechaHasta]  = useState("");
  const [page,        setPage]        = useState(1);

  const tipo = tipoFiltros.length > 0 ? tipoFiltros.join(",") : undefined;

  const { data, isLoading, isFetching, isError, error, refetch, dataUpdatedAt } = useAuditoriaSesiones({
    page,
    pageSize: PAGE_SIZE,
    tipo,
    username:   username   || undefined,
    rol:        rolFiltro  || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  // Cargar establecimientos para resolver nombres por ID
  const { data: estData } = useEstablecimientos({ pageSize: 200 });
  const estMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of estData?.data ?? []) {
      m[e.id] = e.razonSocialCorta || e.razonSocial;
    }
    return m;
  }, [estData]);

  const rows       = data?.data        ?? [];
  const total      = data?.total       ?? 0;
  const totalPages = data?.totalPages  ?? 0;

  const updatedAtStr = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  function resetPage() { setPage(1); }
  function toggleTipo(t: TipoEvento) {
    setTipoFiltros((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
    resetPage();
  }

  const hasFilters = tipoFiltros.length > 0 || username || rolFiltro || fechaDesde || fechaHasta;
  function clearAll() {
    setTipoFiltros([]); setUsername(""); setRolFiltro("");
    setFechaDesde(""); setFechaHasta(""); resetPage();
  }

  function resolveEstablecimiento(s: SesionAuditoria): string {
    if (s.rol === "recepcionista") {
      return s.establecimientoId ? (estMap[s.establecimientoId] ?? "—") : "—";
    }
    if (s.rol && NON_RECEPCIONISTA_ROLES.has(s.rol)) {
      return "Dir. de Turismo";
    }
    return "—";
  }

  const columns: Column<SesionAuditoria>[] = [
    {
      key: "eventoTimestamp",
      header: "Fecha y Hora",
      cell: (s) => (
        <span className="font-mono text-xs text-foreground whitespace-nowrap">
          {formatDateTime(s.eventoTimestamp)}
        </span>
      ),
    },
    {
      key: "tipoEvento",
      header: "Tipo",
      cell: (s) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TIPO_COLORS[s.tipoEvento]}`}>
          {s.tipoEvento}
        </span>
      ),
    },
    {
      key: "username",
      header: "Usuario",
      cell: (s) => (
        <div className="min-w-0">
          <div className="font-semibold text-sm text-foreground leading-tight">
            {s.username || "—"}
          </div>
          {s.nombreCompleto?.trim() && (
            <div className="text-xs text-muted-foreground truncate">{s.nombreCompleto}</div>
          )}
        </div>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      cell: (s) => s.rol ? (
        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium whitespace-nowrap">
          {ROLE_LABELS[s.rol] ?? s.rol}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      key: "establecimientoId",
      header: "Establecimiento",
      cell: (s) => (
        <span className="text-xs text-muted-foreground">{resolveEstablecimiento(s)}</span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      cell: (s) => (
        <span className="text-xs font-mono text-muted-foreground">{s.ipAddress || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Auditoría de Sesiones</h2>
            <p className="text-sm text-muted-foreground">
              Historial de eventos de autenticación registrados desde el IAM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {updatedAtStr && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Actualizado a las {updatedAtStr}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg border border-primary text-primary bg-background hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="relative w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Usuario..."
            value={username}
            onChange={(e) => { setUsername(e.target.value); resetPage(); }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <select
          value={rolFiltro}
          onChange={(e) => { setRolFiltro(e.target.value); resetPage(); }}
          className="h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => { setFechaDesde(e.target.value); resetPage(); }}
            className="h-9 text-sm w-[138px]"
            title="Fecha desde"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => { setFechaHasta(e.target.value); resetPage(); }}
            className="h-9 text-sm w-[138px]"
            title="Fecha hasta"
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="h-9 px-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            <X size={13} />
            Limpiar
          </button>
        )}
      </div>

      {/* Chips tipo evento */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">Tipo:</span>
        <FilterChips<TipoEvento> chips={TIPO_CHIPS} selected={tipoFiltros} onToggle={toggleTipo} />
      </div>

      {/* Contador */}
      <div className="text-sm text-muted-foreground">
        {isLoading ? "Cargando..." : `${total.toLocaleString()} registros en total`}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="sm" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          <p className="font-semibold">Error al cargar los registros</p>
          <p className="text-xs mt-1 text-muted-foreground font-mono">
            {(error as Error)?.message ?? "Error desconocido"}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowKey={(s) => s.id}
          emptyMessage="No se encontraron registros con los filtros aplicados."
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* Advertencia rango máximo */}
      {totalPages > 0 && (
        <p className="text-xs text-muted-foreground">
          Mostrando página {page} de {totalPages}. Rango máximo de consulta: 366 días.
        </p>
      )}
    </div>
  );
}
