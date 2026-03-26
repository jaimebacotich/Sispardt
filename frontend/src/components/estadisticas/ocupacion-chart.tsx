"use client";

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
import { formatDate } from "@/lib/utils";
import type { OcupacionDiaria } from "@/types/api";

interface OcupacionChartProps {
  data: OcupacionDiaria[];
  isLoading: boolean;
}

export function OcupacionChart({ data, isLoading }: OcupacionChartProps) {
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
    fecha: d.fechaReporte,
    huespedes: d.totalHuespedes,
    ocupacion: d.porcentajeOcupacion ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={chartData}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="fecha"
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("es-BO", {
              day: "numeric",
              month: "short",
            })
          }
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
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
          labelFormatter={(v) => formatDate(v as string)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [
            value,
            name === "huespedes" ? "Huéspedes" : "Ocupación %",
          ]}
        />
        <Line
          type="monotone"
          dataKey="huespedes"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
