import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface WaterPieChartProps {
  data: Array<{ name: string; value: number }>;
  title: string;
  unit?: string;
  height?: number;
}

const COLORS = [
  "hsl(152, 60%, 42%)",
  "hsl(210, 80%, 55%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 55%)",
  "hsl(170, 60%, 45%)",
  "hsl(330, 60%, 50%)",
  "hsl(50, 80%, 50%)",
];

export function WaterPieChart({ data, title, unit = "m³", height = 300 }: WaterPieChartProps) {
  return (
    <div className="rounded-xl bg-card p-3 md:p-5 shadow-card">
      <h3 className="text-xs md:text-sm font-semibold mb-3 md:mb-4">{title}</h3>
      <div className="h-[200px] md:h-auto">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) =>
                `${name.length > 12 ? name.slice(0, 12) + "…" : name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(0)} ${unit}`, ""]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "0.7rem" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
