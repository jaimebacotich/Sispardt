"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { OcupacionDiaria } from "@/types/api";

const MES_CORTO: Record<string, string> = {
  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
};

interface TasaOcupacionChartProps {
  data: OcupacionDiaria[];
  isLoading: boolean;
}

export function TasaOcupacionChart({ data, isLoading }: TasaOcupacionChartProps) {
  const { seriesSemanal, modoHuespedes } = useMemo(() => {
    const weekStart = (dateStr: string): string => {
      const d = new Date(dateStr + "T00:00:00");
      const dow = d.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    };

    // Determinar si hay datos de capacidad reales (porcentajeOcupacion > 0)
    const hayCapacidad = data.some(d => (d.porcentajeOcupacion ?? 0) > 0);

    const byWeek: Record<string, { sumPct: number; sumHuespedes: number; count: number }> = {};
    for (const d of data) {
      const ws = weekStart(d.fechaReporte);
      if (!byWeek[ws]) byWeek[ws] = { sumPct: 0, sumHuespedes: 0, count: 0 };
      byWeek[ws].sumPct += d.porcentajeOcupacion ?? 0;
      byWeek[ws].sumHuespedes += d.totalHuespedes;
      byWeek[ws].count += 1;
    }

    const series = Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ws, { sumPct, sumHuespedes, count }]) => {
        const [, mm, dd] = ws.split("-");
        return {
          semana: `${dd}/${MES_CORTO[mm] ?? mm}`,
          tasa: hayCapacidad ? +((sumPct / count)).toFixed(1) : sumHuespedes,
        };
      });

    return { seriesSemanal: series, modoHuespedes: !hayCapacidad };
  }, [data]);

  if (isLoading) {
    return <Skeleton className="w-full h-[200px]" />;
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        Sin datos para el período seleccionado
      </div>
    );
  }

  return (
    <div>
      {modoHuespedes && (
        <p className="text-xs text-muted-foreground mb-2">
          Mostrando huéspedes por semana (sin datos de capacidad hotelera)
        </p>
      )}
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={seriesSemanal}
        margin={{ top: 8, right: 16, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="semana"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          domain={modoHuespedes ? ["auto", "auto"] : [0, 100]}
          unit={modoHuespedes ? "" : "%"}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(v: unknown) =>
            modoHuespedes
              ? [`${v as number}`, "Huéspedes / semana"]
              : [`${v as number}%`, "Tasa de Ocupación"]
          }
        />
        <Line
          type="monotone"
          dataKey="tasa"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 5 }}
          activeDot={{ r: 7, fill: "hsl(var(--primary))" }}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
