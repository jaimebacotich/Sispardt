"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const MOCK_DATA = [
  { tipo: "Doble", cantidad: 185, porcentaje: 43.7 },
  { tipo: "Simple", cantidad: 98, porcentaje: 23.2 },
  { tipo: "Matrimonial", cantidad: 76, porcentaje: 18.0 },
  { tipo: "Suite", cantidad: 42, porcentaje: 9.9 },
  { tipo: "Triple", cantidad: 22, porcentaje: 5.2 },
];

const COLORS = [
  "hsl(var(--primary))",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function DistribucionTipoChart() {
  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={MOCK_DATA}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={2}
            dataKey="cantidad"
          >
            {MOCK_DATA.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: unknown, _n: any, props: any) => [
              `${v as number} reservas (${props.payload.porcentaje}%)`,
              props.payload.tipo,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Leyenda */}
      <div className="space-y-1.5">
        {MOCK_DATA.map((item, i) => (
          <div key={item.tipo} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs flex-1 text-foreground">{item.tipo}</span>
            <span className="text-xs font-medium text-foreground">
              {item.cantidad}
            </span>
            <span className="text-xs text-muted-foreground w-12 text-right">
              {item.porcentaje}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
