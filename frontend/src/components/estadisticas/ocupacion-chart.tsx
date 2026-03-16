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
import { formatDate } from "@/lib/utils";

// Mock: últimos 30 días de ocupación
function generateData() {
  const data = [];
  const now = new Date("2026-03-08");
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      fecha: d.toISOString().slice(0, 10),
      huespedes: Math.floor(Math.random() * 400 + 400),
      ocupacion: Math.floor(Math.random() * 40 + 55),
    });
  }
  return data;
}

const MOCK_DATA = generateData();

interface OcupacionChartProps {
  periodo: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function OcupacionChart({ periodo: _periodo }: OcupacionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={MOCK_DATA}
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
