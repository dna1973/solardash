import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface WaterBarChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  unit?: string;
  height?: number;
}

export function WaterBarChart({ data, title, unit = "m³", height = 300 }: WaterBarChartProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-xl bg-card p-3 md:p-5 shadow-card">
      <h3 className="text-xs md:text-sm font-semibold mb-3 md:mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(height, sorted.length * 32 + 40)}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + "…" : v}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(0)} ${unit}`, "Consumo"]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
            }}
          />
          <Bar dataKey="value" fill="hsl(210, 80%, 55%)" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
