import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface WaterBarChartData {
  name: string;
  value: number;
  totalValue?: number;
}

interface WaterBarChartProps {
  data: WaterBarChartData[];
  title: string;
  unit?: string;
  height?: number;
}

export function WaterBarChart({ data, title, unit = "m³", height = 350 }: WaterBarChartProps) {
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-xl bg-card p-3 md:p-5 shadow-card">
      <h3 className="text-xs md:text-sm font-semibold mb-3 md:mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={sorted} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            angle={-35}
            textAnchor="end"
            interval={0}
            tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v}
          />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as WaterBarChartData;
              return (
                <div
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    padding: "8px 12px",
                    fontSize: "0.75rem",
                  }}
                >
                  <p className="font-medium mb-1">{d.name}</p>
                  <p>Consumo: {d.value.toFixed(0)} {unit}</p>
                  {d.totalValue != null && (
                    <p>Valor: R$ {d.totalValue.toFixed(2)}</p>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill="hsl(210, 80%, 55%)" radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
