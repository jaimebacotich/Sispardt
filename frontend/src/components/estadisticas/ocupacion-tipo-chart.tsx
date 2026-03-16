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

const MOCK_DATA = [
  { tipo: "Simple", ocupacion: 78 },
  { tipo: "Doble", ocupacion: 85 },
  { tipo: "Triple", ocupacion: 62 },
  { tipo: "Suite", ocupacion: 91 },
  { tipo: "Matrimonial", ocupacion: 74 },
];

const COLORS = [
  "hsl(var(--primary))",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function OcupacionTipoChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={MOCK_DATA}
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
          {MOCK_DATA.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
