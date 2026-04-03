"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { TipoHabitacionStat } from "@/types/api";

const COLORS = [
  "hsl(var(--primary))",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface OcupacionTipoChartProps {
  data: TipoHabitacionStat[];
  isLoading: boolean;
}

export function OcupacionTipoChart({ data, isLoading }: OcupacionTipoChartProps) {
  if (isLoading) {
    return <Skeleton className="w-full h-[220px]" />;
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
        Sin datos para el período seleccionado
      </div>
    );
  }

  const chartData = data.map((d) => ({
    tipo: d.tipoHabitacion,
    ocupacion: d.porcentajeOcupacion,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="tipo"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
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
          formatter={(v: unknown) => [`${v as number}%`, "Ocupación"]}
        />
        <Bar dataKey="ocupacion" radius={[4, 4, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
