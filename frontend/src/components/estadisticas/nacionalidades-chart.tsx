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
import type { NacionalidadStat } from "@/types/api";

const COLORS = [
  "hsl(var(--primary))",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(var(--muted-foreground))",
];

interface NacionalidadesChartProps {
  data: NacionalidadStat[];
  isLoading: boolean;
}

export function NacionalidadesChart({ data, isLoading }: NacionalidadesChartProps) {
  if (isLoading) {
    return <Skeleton className="w-full h-[220px]" />;
  }

  const chartData = data.map((d) => ({
    pais: d.paisNombre,
    cantidad: d.cantidadIngresos,
    porcentaje: d.porcentaje,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="pais"
          type="category"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(v: unknown, _n: unknown, props: { payload?: { porcentaje?: number } }) => [
            `${v as number} (${props.payload?.porcentaje ?? 0}%)`,
            "Huéspedes",
          ]}
        />
        <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
