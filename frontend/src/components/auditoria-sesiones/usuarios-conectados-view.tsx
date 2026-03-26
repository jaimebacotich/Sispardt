"use client";

import { useState, useMemo } from "react";
import { RefreshCw, Wifi, Search, X, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { useUsuariosConectados } from "@/hooks/useAuditoriaSesiones";
import { useEstablecimientos } from "@/hooks/useEstablecimientos";
import type { ConectadoInfo } from "@/types/api";

// Roles de aplicación conocidos — se filtran los roles internos de Keycloak
const APP_ROLES = new Set([
  "admin_general",
  "responsable_registro",
  "tecnico_registro",
  "responsable_estadistica",
  "recepcionista",
]);

const ROLE_OPTIONS = [
  { value: "",                       label: "Todos los roles" },
  { value: "admin_general",          label: "Admin General" },
  { value: "responsable_registro",   label: "Resp. Registro" },
  { value: "tecnico_registro",       label: "Téc. Registro" },
  { value: "responsable_estadistica",label: "Resp. Estadística" },
  { value: "recepcionista",          label: "Recepcionista" },
];

const ROLE_LABELS: Record<string, string> = {
  admin_general:             "Admin General",
  responsable_registro:      "Resp. Registro",
  tecnico_registro:          "Téc. Registro",
  responsable_estadistica:   "Resp. Estadística",
  recepcionista:             "Recepcionista",
};

function appRoles(roles: string[]): string[] {
  return roles.filter((r) => APP_ROLES.has(r));
}

export function UsuariosConectadosView() {
  const [username, setUsername] = useState("");
  const [rolFiltro, setRolFiltro] = useState("");

  const { data, isLoading, isFetching, isError, error, refetch } = useUsuariosConectados({
    username: username || undefined,
    rol:      rolFiltro || undefined,
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

  const conectados: ConectadoInfo[] = data?.conectados ?? [];
  const advertencias: string[]      = data?.advertencias ?? [];
  const total                       = data?.total ?? 0;
  const consultadoAt                = data?.consultadoAt;

  const hasFilters = username || rolFiltro;
  function clearAll() { setUsername(""); setRolFiltro(""); }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Wifi size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Usuarios Conectados</h2>
            <p className="text-sm text-muted-foreground">
              Sesiones activas en tiempo real desde el IAM
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg border border-primary text-primary bg-background hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Sesiones activas</div>
            <div className="text-2xl font-bold text-foreground">{total}</div>
          </div>
        </div>
        {consultadoAt && (
          <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Última consulta</div>
              <div className="text-xs font-mono text-foreground mt-0.5">
                {formatDateTime(consultadoAt)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advertencias de fallos parciales */}
      {advertencias.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-400/40 bg-yellow-50/50 dark:bg-yellow-900/10 p-3">
          <AlertTriangle size={15} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
              Algunos clientes no respondieron (datos parciales):
            </p>
            <ul className="mt-1 space-y-0.5">
              {advertencias.map((a) => (
                <li key={a} className="text-xs text-yellow-600 dark:text-yellow-500 font-mono">{a}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Usuario..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <select
          value={rolFiltro}
          onChange={(e) => setRolFiltro(e.target.value)}
          className="h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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

      {/* Contenido */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="sm" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          <p className="font-semibold">Error al obtener sesiones activas</p>
          <p className="text-xs mt-1 text-muted-foreground font-mono">
            {(error as Error)?.message ?? "Error desconocido"}
          </p>
        </div>
      ) : conectados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Wifi size={32} className="opacity-30" />
          <p className="text-sm">No hay sesiones activas en este momento.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inicio sesión</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conectado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Establecimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {conectados.map((c) => (
                <ConectadoRow key={c.sesionId} c={c} estMap={estMap} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Se actualiza automáticamente cada 30 segundos.
      </p>
    </div>
  );
}

function ConectadoRow({ c, estMap }: { c: ConectadoInfo; estMap: Record<string, string> }) {
  const roles = appRoles(c.roles);
  const rol   = roles[0] ?? null;
  const estNombre = rol === "recepcionista"
    ? (c.establecimientoId ? (estMap[c.establecimientoId] ?? "—") : "—")
    : rol && rol !== "recepcionista"
      ? "Dir. de Turismo"
      : "—";

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* Usuario */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase">
              {c.username?.charAt(0) ?? "?"}
            </span>
          </div>
          <div className="min-w-0">
            <div className="font-medium text-foreground leading-tight">{c.username || "—"}</div>
            {c.nombreCompleto?.trim() && (
              <div className="text-xs text-muted-foreground truncate">{c.nombreCompleto}</div>
            )}
          </div>
        </div>
      </td>

      {/* IP */}
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
        {c.ipAddress || "—"}
      </td>

      {/* Inicio sesión */}
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {formatDateTime(c.inicioSesion)}
      </td>

      {/* Tiempo conectado */}
      <td className="px-4 py-3">
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {c.tiempoConectado}
        </span>
      </td>

      {/* Rol */}
      <td className="px-4 py-3">
        {rol ? (
          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {ROLE_LABELS[rol] ?? rol}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Establecimiento (solo recepcionistas) */}
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {estNombre ?? "—"}
      </td>
    </tr>
  );
}
