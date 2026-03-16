"use client";

import { useState } from "react";
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
import { OcupacionChart } from "./ocupacion-chart";
import { NacionalidadesChart } from "./nacionalidades-chart";
import { OcupacionTipoChart } from "./ocupacion-tipo-chart";
import { DistribucionTipoChart } from "./distribucion-tipo-chart";
import { TasaOcupacionChart } from "./tasa-ocupacion-chart";
import { MotivosViajeChart } from "./motivos-viaje-chart";
import { cn } from "@/lib/utils";

export type Periodo = "7d" | "30d" | "90d" | "anio" | "custom";

const LOCALIDADES = [
  "Todas las localidades",
  "Tarija",
  "Bermejo",
  "Yacuiba",
  "Villamontes",
  "Entre Ríos",
];

const ESTABLECIMIENTOS = [
  "Todos los establecimientos",
  "Hotel Tarija Plaza",
  "Hostal El Mirador",
  "Hotel Bermejo",
];

const PERIODO_OPTS: { key: Periodo; label: string }[] = [
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
  { key: "anio", label: "Este Año" },
  { key: "custom", label: "Definir fechas" },
];

const MOCK = {
  visitantes: 1247,
  visitantesTrend: 8.3,
  turistasExtranjeros: 312,
  turistasExtranjerosTrend: 14.6,
  ocupacionProm: 72.4,
  ocupacionTrend: 3.1,
  estadiaProm: 2.8,
  estadiaTrend: -1.2,
  capacidadHotelera: 847,
  checkins: 423,
  checkinsTrend: 12.5,
  checkouts: 401,
  checkoutsTrend: 10.2,
  pernoctes: 3491,
  pernocteTrend: 6.8,
  estActivos: 12,
  estTotal: 15,
  estLicenciaVigente: 11,
};

export function EstadisticasDashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [localidad, setLocalidad] = useState(LOCALIDADES[0]);
  const [establecimiento, setEstablecimiento] = useState(ESTABLECIMIENTOS[0]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const ahora = new Date();
  const actualizado =
    ahora.toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " — " +
    ahora.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Filtros maestros ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Localidad */}
        <div className="relative">
          <select
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            className="appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[180px]"
          >
            {LOCALIDADES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>

        {/* Establecimientos */}
        <div className="relative">
          <select
            value={establecimiento}
            onChange={(e) => setEstablecimiento(e.target.value)}
            className="appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[230px]"
          >
            {ESTABLECIMIENTOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
        </div>

        {/* Actualizado badge */}
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
            {key === "custom" && (
              <Calendar size={11} className="inline mr-1.5 -mt-px" />
            )}
            {label}
          </button>
        ))}

        {/* Rango de fechas inline */}
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

      {/* ── 10 KPI Cards — 5 por fila ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard compact label="Visitantes" value={MOCK.visitantes} icon={Users} iconColor="text-primary" iconBg="bg-primary/10" trend={MOCK.visitantesTrend} />
        <StatCard compact label="Turistas Extranjeros" value={MOCK.turistasExtranjeros} icon={Globe} iconColor="text-chart-2" iconBg="bg-chart-2/10" trend={MOCK.turistasExtranjerosTrend} />
        <StatCard compact label="Ocupación Prom." value={MOCK.ocupacionProm.toFixed(1)} suffix="%" icon={BedDouble} iconColor="text-chart-3" iconBg="bg-chart-3/10" trend={MOCK.ocupacionTrend} />
        <StatCard compact label="Estadía Prom." value={MOCK.estadiaProm.toFixed(1)} suffix=" noches" icon={Clock} iconColor="text-chart-4" iconBg="bg-chart-4/10" trend={MOCK.estadiaTrend} />
        <StatCard compact label="Capacidad Hotelera" value={MOCK.capacidadHotelera} suffix=" camas" icon={BedSingle} iconColor="text-chart-5" iconBg="bg-chart-5/10" />
        <StatCard compact label="Check-ins" value={MOCK.checkins} icon={LogIn} iconColor="text-status-libre" iconBg="bg-status-libre/10" trend={MOCK.checkinsTrend} />
        <StatCard compact label="Check-outs" value={MOCK.checkouts} icon={LogOut} iconColor="text-chart-2" iconBg="bg-chart-2/10" trend={MOCK.checkoutsTrend} />
        <StatCard compact label="Pernoctes" value={MOCK.pernoctes} icon={Moon} iconColor="text-chart-5" iconBg="bg-chart-5/10" trend={MOCK.pernocteTrend} />
        <StatCard compact label="Est. Activos" value={`${MOCK.estActivos}`} suffix={` / ${MOCK.estTotal}`} icon={Building2} iconColor="text-primary" iconBg="bg-primary/10" />
        <StatCard compact label="Lic. Vigentes" value={`${MOCK.estLicenciaVigente}`} suffix={` / ${MOCK.estTotal}`} icon={BadgeCheck} iconColor="text-status-libre" iconBg="bg-status-libre/10" />
      </div>

      {/* ── Gráficos fila 1: Tendencia Visitantes + Top Nac. ─────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">
              Tendencia de Visitantes
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Flujo de turistas registrados en el período seleccionado
            </p>
          </div>
          <OcupacionChart periodo={periodo} />
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">
              Top Nacionalidades
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              País de origen de los huéspedes
            </p>
          </div>
          <NacionalidadesChart />
        </div>
      </div>

      {/* ── Gráficos fila 2: Ocup. por Tipo + Distribución ───────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">
              Ocupación por Tipo de Habitación
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tasa de ocupación promedio por categoría
            </p>
          </div>
          <OcupacionTipoChart />
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">
              Distribución de Tipo de Habitación
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Proporción de reservas por tipo
            </p>
          </div>
          <DistribucionTipoChart />
        </div>
      </div>

      {/* ── Gráficos fila 3: Tasa Ocupación + Motivos de Viaje ───── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">
              Tasa de Ocupación Mensual
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evolución mensual de la ocupación hotelera en el sistema
            </p>
          </div>
          <TasaOcupacionChart />
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-foreground">
              Motivos de Viaje
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribución por motivo según el período seleccionado
            </p>
          </div>
          <MotivosViajeChart periodo={periodo} />
        </div>
      </div>
    </div>
  );
}
