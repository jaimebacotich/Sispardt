"use client";

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
import type { Periodo } from "./estadisticas-dashboard";

const ALL_DATA = [
  { mes: "Ene", Turismo: 245, Negocios: 89, Familiar: 67, Trabajo: 45, Otros: 32 },
  { mes: "Feb", Turismo: 278, Negocios: 95, Familiar: 72, Trabajo: 51, Otros: 38 },
  { mes: "Mar", Turismo: 312, Negocios: 102, Familiar: 81, Trabajo: 48, Otros: 41 },
  { mes: "Abr", Turismo: 290, Negocios: 88, Familiar: 76, Trabajo: 43, Otros: 35 },
  { mes: "May", Turismo: 335, Negocios: 110, Familiar: 84, Trabajo: 52, Otros: 44 },
  { mes: "Jun", Turismo: 368, Negocios: 121, Familiar: 91, Trabajo: 57, Otros: 49 },
  { mes: "Jul", Turismo: 421, Negocios: 134, Familiar: 98, Trabajo: 61, Otros: 53 },
  { mes: "Ago", Turismo: 398, Negocios: 128, Familiar: 94, Trabajo: 58, Otros: 48 },
  { mes: "Sep", Turismo: 352, Negocios: 115, Familiar: 87, Trabajo: 54, Otros: 45 },
];

const MOTIVOS = [
  { key: "Turismo",  color: "hsl(var(--primary))" },
  { key: "Negocios", color: "var(--chart-2)"       },
  { key: "Familiar", color: "var(--chart-3)"       },
  { key: "Trabajo",  color: "var(--chart-4)"       },
  { key: "Otros",    color: "hsl(var(--muted-foreground))" },
];

function getDataByPeriodo(periodo: Periodo) {
  switch (periodo) {
    case "7d":  return ALL_DATA.slice(-2);
    case "30d": return ALL_DATA.slice(-3);
    case "90d": return ALL_DATA.slice(-6);
    default:    return ALL_DATA;
  }
}

interface Props {
  periodo: Periodo;
}

export function MotivosViajeChart({ periodo }: Props) {
  const data = getDataByPeriodo(periodo);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
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
          dataKey="mes"
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
        {MOTIVOS.map(({ key, color }) => (
          <Bar key={key} dataKey={key} fill={color} radius={[3, 3, 0, 0]} stackId="a" />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
