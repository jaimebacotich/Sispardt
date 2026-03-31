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
  const tasaMensual = useMemo(() => {
    const byMonth: Record<string, { sum: number; count: number }> = {};
    for (const d of data) {
      const ym = d.fechaReporte.slice(0, 7); // "YYYY-MM"
      if (!byMonth[ym]) byMonth[ym] = { sum: 0, count: 0 };
      byMonth[ym].sum += d.porcentajeOcupacion ?? 0;
      byMonth[ym].count += 1;
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, { sum, count }]) => ({
        mes: MES_CORTO[ym.slice(5, 7)] ?? ym.slice(5, 7),
        tasa: +((sum / count)).toFixed(1),
      }));
  }, [data]);

  if (isLoading) {
    return <Skeleton className="w-full h-[200px]" />;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={tasaMensual}
        margin={{ top: 8, right: 16, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          unit="%"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(v: unknown) => [`${v as number}%`, "Tasa de Ocupación"]}
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
  );
}
