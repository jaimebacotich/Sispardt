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

const MOCK_DATA = [
  { mes: "Ene", tasa: 58 },
  { mes: "Feb", tasa: 65 },
  { mes: "Mar", tasa: 72 },
  { mes: "Abr", tasa: 69 },
  { mes: "May", tasa: 78 },
  { mes: "Jun", tasa: 82 },
  { mes: "Jul", tasa: 88 },
  { mes: "Ago", tasa: 85 },
  { mes: "Sep", tasa: 76 },
];

export function TasaOcupacionChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={MOCK_DATA}
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
          domain={[40, 100]}
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
