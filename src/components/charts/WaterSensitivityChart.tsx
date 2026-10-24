"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CoolingTech } from "@/lib/schemas";

const COLORS: Record<CoolingTech, string> = {
  air: "#34d399",
  "closed-loop-liquid": "#38bdf8",
  hybrid: "#fbbf24",
  water: "#f87171",
};

export function WaterSensitivityChart({
  data,
}: {
  data: Array<{ cooling: CoolingTech; label: string; annualWaterLiters: number }>;
}) {
  const chartData = data.map((d) => ({
    name: d.label,
    cooling: d.cooling,
    millionLiters: d.annualWaterLiters / 1_000_000,
  }));

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#8ba0bf", fontSize: 9 }}
            interval={0}
            angle={-12}
            height={34}
          />
          <YAxis tick={{ fill: "#8ba0bf", fontSize: 9 }} width={36} />
          <Tooltip
            contentStyle={{
              background: "#141b2b",
              border: "1px solid #273349",
              borderRadius: 8,
              fontSize: 11,
            }}
            labelStyle={{ color: "#e5ecf5" }}
            formatter={(v: number) => [`${v.toFixed(2)} million L/yr`, "Modeled water"]}
          />
          <Bar dataKey="millionLiters" radius={[3, 3, 0, 0]}>
            {chartData.map((d) => (
              <Cell key={d.cooling} fill={COLORS[d.cooling]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
