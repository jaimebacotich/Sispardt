"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { MotivosPeriodo } from "@/types/api";

const COLORS = [
  "hsl(var(--primary))",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "hsl(var(--muted-foreground))",
];

interface MotivosViajeChartProps {
  data: MotivosPeriodo[];
  isLoading: boolean;
}

export function MotivosViajeChart({ data, isLoading }: MotivosViajeChartProps) {
  const { chartData, motivosKeys } = useMemo(() => {
    const keysSet = new Set<string>();
    const rows = data.map((p) => {
      const row: Record<string, string | number> = { periodo: p.periodo };
      for (const m of p.motivos) {
        keysSet.add(m.motivoNombre);
        row[m.motivoNombre] = m.cantidad;
      }
      return row;
    });
    return { chartData: rows, motivosKeys: Array.from(keysSet) };
  }, [data]);

  if (isLoading) {
    return <Skeleton className="w-full h-[240px]" />;
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">
        Sin datos para el período seleccionado
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        barCategoryGap="28%"
        barGap={2}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="periodo"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          cursor={{ fill: "hsl(var(--muted))" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
        />
        {motivosKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={COLORS[i % COLORS.length]}
            radius={[3, 3, 0, 0]}
            stackId="a"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
