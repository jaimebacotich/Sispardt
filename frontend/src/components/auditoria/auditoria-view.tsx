"use client";

import { useState, useMemo } from "react";
import { Search, X, Database, Calendar, Users } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ActionBadge } from "@/components/shared/action-badge";
import { FilterChips } from "@/components/shared/filter-chips";
import { DiffViewer } from "./diff-viewer";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatDateTime } from "@/lib/utils";
import type { AuditoriaTransaccion, AuditAccion } from "@/types/api";
import type { Column } from "@/components/shared/data-table";
import type { FilterChip } from "@/components/shared/filter-chips";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditoria, useAuditoriaMovimientos, useEstablecimientos } from "@/hooks/useEstablecimientos";

const PAGE_SIZE = 15;

type BDFiltro = "todos" | "establecimientos" | "movimientos";

const BD_CONFIG: Record<BDFiltro, { label: string; border: string; dot: string }> = {
  todos:             { label: "Todos",            border: "border-primary/60",  dot: "bg-primary" },
  establecimientos:  { label: "Establecimientos", border: "border-blue-400",    dot: "bg-blue-500" },
  movimientos:       { label: "Movimientos",      border: "border-emerald-400", dot: "bg-emerald-500" },
};

const ACTION_CHIPS: FilterChip<AuditAccion>[] = [
  { value: "INSERT", label: "INSERT", activeClassName: "bg-status-libre text-white border-status-libre" },
  { value: "UPDATE", label: "UPDATE", activeClassName: "bg-status-pendiente text-white border-status-pendiente" },
  { value: "DELETE", label: "DELETE", activeClassName: "bg-status-ocupada text-white border-status-ocupada" },
];

const TABLA_CHIPS: FilterChip[] = [
  { value: "establecimientos", label: "establecimientos" },
  { value: "habitaciones",     label: "habitaciones" },
  { value: "partes_diarios",   label: "partes_diarios" },
  { value: "cierres_diarios",  label: "cierres_diarios" },
  { value: "personas",         label: "personas" },
  { value: "personal",         label: "personal" },
];

const ROLE_OPTIONS = [
  { value: "",                       label: "Todos los roles" },
  { value: "admin_general",          label: "Admin General" },
  { value: "responsable_registro",   label: "Resp. Registro" },
  { value: "tecnico_registro",       label: "Técnico Registro" },
  { value: "responsable_estadistica",label: "Resp. Estadística" },
  { value: "recepcionista",          label: "Recepcionista" },
];

const DIR_TURISMO_ROLES = new Set([
  "admin_general",
  "responsable_registro",
  "tecnico_registro",
  "responsable_estadistica",
]);

// ── Componente ────────────────────────────────────────────

export function AuditoriaView() {
  const [search,        setSearch]        = useState("");
  const [accionFiltros, setAccionFiltros] = useState<AuditAccion[]>([]);
  const [tablaFiltros,  setTablaFiltros]  = useState<string[]>([]);
  const [bdFiltro,      setBdFiltro]      = useState<BDFiltro>("todos");
  const [rolFiltro,     setRolFiltro]     = useState("");
  const [fechaDesde,    setFechaDesde]    = useState("");
  const [fechaHasta,    setFechaHasta]    = useState("");
  const [page,          setPage]          = useState(1);

  const { data: estabsData } = useEstablecimientos({ pageSize: 200 });
  const estMap = useMemo(() => {
    const m: Record<string, string> = {};
    const items = Array.isArray(estabsData)
      ? estabsData
      : (estabsData as { data?: { id: string; razonSocial: string }[] } | undefined)?.data ?? [];
    for (const e of items) m[e.id] = e.razonSocial;
    return m;
  }, [estabsData]);

  const sharedParams = {
    search:     search     || undefined,
    accion:     accionFiltros.length === 1 ? accionFiltros[0] : undefined,
    tabla:      tablaFiltros.length   === 1 ? tablaFiltros[0]  : undefined,
    rol:        rolFiltro  || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    pageSize:   PAGE_SIZE,
    page,
  };

  const estabEnabled = bdFiltro === "todos" || bdFiltro === "establecimientos";
  const movEnabled   = bdFiltro === "todos" || bdFiltro === "movimientos";

  const { data: estabData, isLoading: loadingEstab, isError: isErrorEstab, error: errorEstab } =
    useAuditoria(estabEnabled ? sharedParams : undefined);
  const { data: movData, isLoading: loadingMov, isError: isErrorMov, error: errorMov } =
    useAuditoriaMovimientos(movEnabled ? sharedParams : undefined);

  const isLoading = (estabEnabled && loadingEstab) || (movEnabled && loadingMov);
  const isError   = (estabEnabled && isErrorEstab) || (movEnabled && isErrorMov);
  const errorMsg  = (errorEstab as Error)?.message ?? (errorMov as Error)?.message ?? "Error desconocido";

  type PagedShape = { data?: AuditoriaTransaccion[]; total?: number };

  const estabRows: AuditoriaTransaccion[] = useMemo(() => {
    if (!estabEnabled) return [];
    const raw = (estabData as PagedShape)?.data ?? (Array.isArray(estabData) ? estabData : []);
    return raw.map((r) => ({ ...r, source: "establecimientos" as const }));
  }, [estabData, estabEnabled]);

  const movRows: AuditoriaTransaccion[] = useMemo(() => {
    if (!movEnabled) return [];
    const raw = (movData as PagedShape)?.data ?? (Array.isArray(movData) ? movData : []);
    return raw.map((r) => ({ ...r, source: "movimientos" as const }));
  }, [movData, movEnabled]);

  const allLogs = useMemo<AuditoriaTransaccion[]>(() => {
    if (bdFiltro === "establecimientos") return estabRows;
    if (bdFiltro === "movimientos")      return movRows;
    return [...estabRows, ...movRows].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [estabRows, movRows, bdFiltro]);

  const estabTotal = (estabData as PagedShape)?.total ?? estabRows.length;
  const movTotal   = (movData   as PagedShape)?.total ?? movRows.length;
  const total =
    bdFiltro === "establecimientos" ? estabTotal :
    bdFiltro === "movimientos"      ? movTotal   :
    estabTotal + movTotal;

  // Filtrado cliente para múltiples selecciones de accion/tabla
  const filtered = allLogs.filter((log) => {
    const matchAccion = accionFiltros.length === 0 || accionFiltros.includes(log.accion);
    const matchTabla  = tablaFiltros.length  === 0 || tablaFiltros.includes(log.tabla);
    return matchAccion && matchTabla;
  });

  const summary = {
    inserts: filtered.filter((l) => l.accion === "INSERT").length,
    updates: filtered.filter((l) => l.accion === "UPDATE").length,
    deletes: filtered.filter((l) => l.accion === "DELETE").length,
  };

  function resetPage() { setPage(1); }
  function toggleAccion(a: AuditAccion) {
    setAccionFiltros((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);
    resetPage();
  }
  function toggleTabla(t: string) {
    setTablaFiltros((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);
    resetPage();
  }
  function handleSearch(v: string)      { setSearch(v);           resetPage(); }
  function handleBdChange(v: BDFiltro)  { setBdFiltro(v);         resetPage(); }
  function handleFechaDesde(v: string)  { setFechaDesde(v);       resetPage(); }
  function handleFechaHasta(v: string)  { setFechaHasta(v);       resetPage(); }
  function handleRolChange(v: string | null) { setRolFiltro(!v || v === "todos" ? "" : v); resetPage(); }

  const hasFilters = search || accionFiltros.length > 0 || tablaFiltros.length > 0
    || bdFiltro !== "todos" || fechaDesde || fechaHasta || rolFiltro;

  function clearAll() {
    setSearch(""); setAccionFiltros([]); setTablaFiltros([]);
    setBdFiltro("todos"); setFechaDesde(""); setFechaHasta(""); setRolFiltro("");
    resetPage();
  }

  function resolveEstablecimiento(log: AuditoriaTransaccion): string {
    if (!log.rol) return "—";
    if (log.rol === "recepcionista") {
      return estMap[log.establecimientoId] ?? log.establecimientoId ?? "—";
    }
    if (DIR_TURISMO_ROLES.has(log.rol)) return "Dir. de Turismo";
    return "—";
  }

  const SOURCE_LABEL: Record<string, { label: string; color: string }> = {
    establecimientos: { label: "Establecimientos", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    movimientos:      { label: "Movimientos",      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  };

  const ROL_BADGE: Record<string, string> = {
    admin_general:           "bg-purple-500/10 text-purple-700 dark:text-purple-300",
    responsable_registro:    "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    tecnico_registro:        "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    responsable_estadistica: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    recepcionista:           "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };

  const columns: Column<AuditoriaTransaccion>[] = [
    {
      key: "timestamp",
      header: "Fecha y Hora",
      cell: (log) => (
        <span className="font-mono text-xs text-foreground whitespace-nowrap">
          {formatDateTime(log.timestamp)}
        </span>
      ),
    },
    {
      key: "source",
      header: "Base de Datos",
      cell: (log) => {
        const cfg = SOURCE_LABEL[log.source ?? ""];
        return cfg ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${cfg.color}`}>
            {cfg.label}
          </span>
        ) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "usuario",
      header: "Usuario",
      cell: (log) => (
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm text-foreground truncate">
            {log.usuario || "—"}
          </span>
          {log.nombreCompleto && (
            <span className="text-xs text-muted-foreground truncate">
              {log.nombreCompleto}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      cell: (log) => log.rol ? (
        <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${ROL_BADGE[log.rol] ?? "bg-muted text-muted-foreground"}`}>
          {log.rol.replace(/_/g, " ")}
        </span>
      ) : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "establecimientoId",
      header: "Establecimiento",
      cell: (log) => (
        <span className="text-xs text-foreground truncate max-w-[140px] block">
          {resolveEstablecimiento(log)}
        </span>
      ),
    },
    {
      key: "accion",
      header: "Acción",
      cell: (log) => <ActionBadge action={log.accion} />,
    },
    {
      key: "tabla",
      header: "Tabla",
      cell: (log) => (
        <span className="bg-primary/10 text-primary text-xs font-mono px-2 py-0.5 rounded">
          {log.tabla}
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP",
      cell: (log) => (
        <span className="text-xs font-mono text-muted-foreground">{log.ipAddress || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Database size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Auditoría Transaccional</h2>
          <p className="text-sm text-muted-foreground">
            Registro de operaciones en todas las bases de datos
          </p>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-status-libre flex-shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Inserciones</div>
            <div className="text-xl font-bold text-foreground">{summary.inserts}</div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-status-pendiente flex-shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Actualizaciones</div>
            <div className="text-xl font-bold text-foreground">{summary.updates}</div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-status-ocupada flex-shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Eliminaciones</div>
            <div className="text-xl font-bold text-foreground">{summary.deletes}</div>
          </div>
        </div>
      </div>

      {/* ── Filtros superiores ────────────────────────────── */}
      <div className="flex gap-3 flex-wrap items-end">
        {/* Búsqueda */}
        <div className="relative w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Usuario, tabla..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Filtro de rol */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground pl-0.5 flex items-center gap-1">
            <Users size={12} />
            Rol:
          </label>
          <Select value={rolFiltro || "todos"} onValueChange={handleRolChange}>
            <SelectTrigger className="h-9 w-[190px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "todos"} value={opt.value || "todos"}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Intervalo de fechas */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => handleFechaDesde(e.target.value)}
            className="h-9 text-sm w-[138px]"
            title="Fecha desde"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => handleFechaHasta(e.target.value)}
            className="h-9 text-sm w-[138px]"
            title="Fecha hasta"
          />
        </div>

        {/* Selector BD */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground pl-0.5">
            Base de Datos:
          </label>
          <Select value={bdFiltro} onValueChange={(v) => handleBdChange(v as BDFiltro)}>
            <SelectTrigger
              className={`h-9 w-[200px] text-sm border-2 bg-background text-foreground ${BD_CONFIG[bdFiltro].border}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${BD_CONFIG[bdFiltro].dot} flex-shrink-0`} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(BD_CONFIG) as [BDFiltro, typeof BD_CONFIG[BDFiltro]][]).map(([val, cfg]) => (
                <SelectItem key={val} value={val}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Limpiar */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="h-9 px-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors self-end"
          >
            <X size={13} />
            Limpiar
          </button>
        )}
      </div>

      {/* ── Chips de filtro ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">Filtros:</span>
        <FilterChips<AuditAccion> chips={ACTION_CHIPS} selected={accionFiltros} onToggle={toggleAccion} />
        <div className="w-px h-4 bg-border" />
        <FilterChips chips={TABLA_CHIPS} selected={tablaFiltros} onToggle={toggleTabla} />
      </div>

      {/* ── Contador ───────────────────────────────────────── */}
      <div className="text-sm text-muted-foreground">
        {isLoading ? "Cargando..." : `${total.toLocaleString()} registros en total`}
      </div>

      {/* ── Tabla ──────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="sm" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          <p className="font-semibold">Error al cargar los registros de auditoría</p>
          <p className="text-xs mt-1 text-muted-foreground font-mono">{errorMsg}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          getRowKey={(l) => `${l.source}-${l.id}`}
          emptyMessage="No se encontraron registros con los filtros aplicados."
          expandedContent={(log) => <DiffViewer log={log} />}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
