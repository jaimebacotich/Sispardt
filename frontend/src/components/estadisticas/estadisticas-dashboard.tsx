"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import {
  Users,
  BedDouble,
  BedSingle,
  Clock,
  LogIn,
  LogOut,
  Moon,
  Building2,
  BadgeCheck,
  Globe,
} from "lucide-react";
import { StatCard } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { OcupacionChart } from "./ocupacion-chart";
import { NacionalidadesChart } from "./nacionalidades-chart";
import { OcupacionTipoChart } from "./ocupacion-tipo-chart";
import { DistribucionTipoChart } from "./distribucion-tipo-chart";
import { TasaOcupacionChart } from "./tasa-ocupacion-chart";
import { MotivosViajeChart } from "./motivos-viaje-chart";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useEstablecimientos, useLocalidades } from "@/hooks/useEstablecimientos";
import {
  useOcupacion,
  useResumenEstadisticas,
  useNacionalidades,
  useMotivosViaje,
  useTiposHabitacion,
} from "@/hooks/useMovimientos";
import type { Establecimiento } from "@/types/api";

export type Periodo = "7d" | "30d" | "90d" | "anio" | "custom";

const PERIODO_OPTS: { key: Periodo; label: string }[] = [
  { key: "7d",     label: "7 días" },
  { key: "30d",    label: "30 días" },
  { key: "90d",    label: "90 días" },
  { key: "anio",   label: "Este Año" },
  { key: "custom", label: "Definir fechas" },
];

function subDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 86_400_000);
}

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function periodoToFechas(
  periodo: Periodo,
  customDesde: string,
  customHasta: string
): { fechaDesde: string; fechaHasta: string } {
  const hoy = new Date();
  switch (periodo) {
    case "7d":    return { fechaDesde: fmtDate(subDays(hoy, 7)),  fechaHasta: fmtDate(hoy) };
    case "30d":   return { fechaDesde: fmtDate(subDays(hoy, 30)), fechaHasta: fmtDate(hoy) };
    case "90d":   return { fechaDesde: fmtDate(subDays(hoy, 90)), fechaHasta: fmtDate(hoy) };
    case "anio":  return { fechaDesde: `${hoy.getFullYear()}-01-01`, fechaHasta: fmtDate(hoy) };
    case "custom": return { fechaDesde: customDesde, fechaHasta: customHasta };
  }
}

function agrupacionDesdePeriodo(periodo: Periodo): string {
  switch (periodo) {
    case "7d":  return "dia";
    case "30d": return "semana";
    default:    return "mes";
  }
}

export function EstadisticasDashboard() {
  const { isRecepcionista, establecimientoId: tokenEstId } = useAuth();

  const [periodo, setPeriodo]       = useState<Periodo>("30d");
  const [localidadId, setLocalidadId] = useState<string>("");
  const [establecimientoId, setEstablecimientoId] = useState<string>(
    isRecepcionista && tokenEstId ? tokenEstId : ""
  );
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Fechas efectivas
  const { fechaDesde: fd, fechaHasta: fh } = useMemo(
    () => periodoToFechas(periodo, fechaDesde, fechaHasta),
    [periodo, fechaDesde, fechaHasta]
  );

  const customInvalid = periodo === "custom" && (!fd || !fh);

  // Localidades del Departamento de Tarija desde el catálogo geo
  const { data: todasLocalidades } = useLocalidades();
  const localidades = useMemo(
    () =>
      (todasLocalidades ?? [])
        .filter((l) => l.divisionPrincipalNombre?.toLowerCase() === "tarija")
        .map((l) => ({ id: String(l.id), nombre: l.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [todasLocalidades]
  );

  // Establecimientos filtrados server-side por localidad seleccionada
  const { data: establecimientos, isLoading: loadingEst } = useEstablecimientos({
    pageSize: 500,
    localidadId: localidadId || undefined,
  });
  const estList: Establecimiento[] = establecimientos?.data ?? [];

  // KPI de infra (no dependen del período)
  const estActivos = useMemo(() => estList.filter((e) => e.activo).length, [estList]);
  const estTotal = estList.length;
  const capacidadHotelera = useMemo(() => estList.reduce((s, e) => s + e.capacidadHospedaje, 0), [estList]);
  const licVigentes = useMemo(
    () =>
      estList.filter((e) =>
        e.tieneLicenciaTuristica &&
        (e.fechaVencimientoLicencia ? new Date(e.fechaVencimientoLicencia) >= new Date() : true)
      ).length,
    [estList]
  );

  // Params para hooks de estadísticas (requieren establecimientoId + fechas)
  const statsParams = { establecimientoId, fechaDesde: fd, fechaHasta: fh };
  const enabled = !!establecimientoId && !customInvalid;

  const { data: resumen,       isLoading: loadingResumen      } = useResumenEstadisticas(enabled ? statsParams : { establecimientoId: "", fechaDesde: fd, fechaHasta: fh });
  const { data: ocupacionData, isLoading: loadingOcupacion    } = useOcupacion(enabled ? establecimientoId : "", fd, fh);
  const { data: nacionalidades,isLoading: loadingNac          } = useNacionalidades(enabled ? statsParams : { establecimientoId: "", fechaDesde: fd, fechaHasta: fh });
  const { data: motivos,       isLoading: loadingMotivos       } = useMotivosViaje(enabled ? { ...statsParams, agrupacion: agrupacionDesdePeriodo(periodo) } : { establecimientoId: "", fechaDesde: fd, fechaHasta: fh });
  const { data: tiposHab,      isLoading: loadingTipos         } = useTiposHabitacion(enabled ? statsParams : { establecimientoId: "", fechaDesde: fd, fechaHasta: fh });

  const ahora = new Date();
  const actualizado =
    ahora.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " — " +
    ahora.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Filtros maestros ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Localidad — solo para roles no-recepcionista */}
        {!isRecepcionista && (
          <div className="relative">
            <select
              value={localidadId}
              onChange={(e) => {
                setLocalidadId(e.target.value);
                setEstablecimientoId(""); // resetear establecimiento al cambiar localidad
              }}
              className="appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[180px]"
            >
              <option value="">Todas las localidades</option>
              {localidades.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}

        {/* Establecimiento */}
        {!isRecepcionista && (
          <div className="relative">
            {loadingEst ? (
              <Skeleton className="h-9 w-[230px] rounded-lg" />
            ) : (
              <>
                <select
                  value={establecimientoId}
                  onChange={(e) => setEstablecimientoId(e.target.value)}
                  className="appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[230px]"
                >
                  <option value="">Todos los establecimientos</option>
                  {estList.map((e) => (
                    <option key={e.id} value={e.id}>{e.razonSocialCorta}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </>
            )}
          </div>
        )}

        {/* Badge actualizado */}
        <span className="ml-auto text-xs text-muted-foreground hidden sm:block">
          Actualizado: {actualizado}
        </span>
      </div>

      {/* ── Selector de período ──────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {PERIODO_OPTS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriodo(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              periodo === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {key === "custom" && <Calendar size={11} className="inline mr-1.5 -mt-px" />}
            {label}
          </button>
        ))}

        {/* Rango de fechas custom */}
        {periodo === "custom" && (
          <div className="flex items-center gap-2 ml-1">
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
      </div>

      {/* Aviso cuando no hay establecimiento seleccionado (roles admin) */}
      {!isRecepcionista && !establecimientoId && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-2.5">
          Selecciona un establecimiento para ver los datos estadísticos.
        </p>
      )}

      {/* Aviso cuando el rango custom está incompleto */}
      {customInvalid && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-2.5">
          Selecciona un rango de fechas completo.
        </p>
      )}

      {/* ── 10 KPI Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard compact label="Visitantes"       value={resumen?.totalHuespedes ?? 0}                  icon={Users}      iconColor="text-primary"        iconBg="bg-primary/10"        isLoading={loadingResumen} />
        <StatCard compact label="Turistas Extranj." value={resumen?.totalExtranjeros ?? 0}               icon={Globe}      iconColor="text-chart-2"        iconBg="bg-chart-2/10"        isLoading={loadingResumen} />
        <StatCard compact label="Ocupación Prom."  value={(resumen?.ocupacionPromedio ?? 0).toFixed(1)} suffix="%" icon={BedDouble}  iconColor="text-chart-3"        iconBg="bg-chart-3/10"        isLoading={loadingResumen} />
        <StatCard compact label="Estadía Prom."    value={(resumen?.estadiaPromedioDias ?? 0).toFixed(1)} suffix=" noches" icon={Clock}   iconColor="text-chart-4"        iconBg="bg-chart-4/10"        isLoading={loadingResumen} />
        <StatCard compact label="Capacidad Hotelera" value={capacidadHotelera} suffix=" camas" icon={BedSingle} iconColor="text-chart-5"        iconBg="bg-chart-5/10"        isLoading={loadingEst} />
        <StatCard compact label="Check-ins"        value={resumen?.totalCheckins ?? 0}                   icon={LogIn}      iconColor="text-status-libre"   iconBg="bg-status-libre/10"   isLoading={loadingResumen} />
        <StatCard compact label="Check-outs"       value={resumen?.totalCheckouts ?? 0}                  icon={LogOut}     iconColor="text-chart-2"        iconBg="bg-chart-2/10"        isLoading={loadingResumen} />
        <StatCard compact label="Pernoctes"        value={resumen?.totalPernoctes ?? 0}                  icon={Moon}       iconColor="text-chart-5"        iconBg="bg-chart-5/10"        isLoading={loadingResumen} />
        <StatCard compact label="Est. Activos"     value={`${estActivos}`} suffix={` / ${estTotal}`}     icon={Building2}  iconColor="text-primary"        iconBg="bg-primary/10"        isLoading={loadingEst} />
        <StatCard compact label="Lic. Vigentes"    value={`${licVigentes}`} suffix={` / ${estTotal}`}    icon={BadgeCheck} iconColor="text-status-libre"   iconBg="bg-status-libre/10"   isLoading={loadingEst} />
      </div>

      {/* ── Gráficos fila 1: Tendencia Visitantes + Top Nac. ─────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">Tendencia de Visitantes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Flujo de turistas registrados en el período seleccionado</p>
          </div>
          <OcupacionChart data={ocupacionData ?? []} isLoading={loadingOcupacion} />
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">Top Nacionalidades</h3>
            <p className="text-xs text-muted-foreground mt-0.5">País de origen de los huéspedes</p>
          </div>
          <NacionalidadesChart data={nacionalidades ?? []} isLoading={loadingNac} />
        </div>
      </div>

      {/* ── Gráficos fila 2: Ocup. por Tipo + Distribución ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">Ocupación por Tipo de Habitación</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tasa de ocupación promedio por categoría</p>
          </div>
          <OcupacionTipoChart data={tiposHab ?? []} isLoading={loadingTipos} />
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">Distribución de Tipo de Habitación</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Proporción de camas por tipo</p>
          </div>
          <DistribucionTipoChart data={tiposHab ?? []} isLoading={loadingTipos} />
        </div>
      </div>

      {/* ── Gráficos fila 3: Tasa Ocupación + Motivos de Viaje ───── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">Tasa de Ocupación Mensual</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Evolución mensual de la ocupación hotelera</p>
          </div>
          <TasaOcupacionChart data={ocupacionData ?? []} isLoading={loadingOcupacion} />
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">Motivos de Viaje</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribución por motivo según el período seleccionado</p>
          </div>
          <MotivosViajeChart data={motivos ?? []} isLoading={loadingMotivos} />
        </div>
      </div>
    </div>
  );
}
