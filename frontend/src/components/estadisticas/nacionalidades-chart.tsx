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
  { pais: "Bolivia", cantidad: 342 },
  { pais: "Argentina", cantidad: 198 },
  { pais: "Brasil", cantidad: 124 },
  { pais: "Chile", cantidad: 98 },
  { pais: "Perú", cantidad: 76 },
  { pais: "Otros", cantidad: 58 },
];

const COLORS = [
  "hsl(var(--primary))",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(var(--muted-foreground))",
];

export function NacionalidadesChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={MOCK_DATA}
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
          width={62}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(v: unknown) => [v as number, "Huéspedes"]}
        />
        <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
          {MOCK_DATA.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
