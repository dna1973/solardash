import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface SeriesConfig {
  dataKey: string;
  name: string;
  color: string;
  yAxisId: "left" | "right";
}

interface ConsumptionHistoryChartProps {
  data: Array<Record<string, string | number>>;
  title: string;
  series: SeriesConfig[];
  leftUnit?: string;
  rightUnit?: string;
  height?: number;
}

export function ConsumptionHistoryChart({
  data,
  title,
  series,
  leftUnit = "kWh",
  rightUnit = "R$",
  height = 320,
}: ConsumptionHistoryChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-xl bg-card p-3 md:p-5 shadow-card">
      <h3 className="text-xs md:text-sm font-semibold mb-3 md:mb-4">{title}</h3>
      <div className="h-[240px] md:h-auto">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.dataKey} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={45}
              tickFormatter={(v: number) => v.toLocaleString("pt-BR")}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={55}
              tickFormatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                const s = series.find((x) => x.name === name);
                const unit = s?.yAxisId === "right" ? rightUnit : leftUnit;
                if (unit === "R$") {
                  return [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name];
                }
                return [`${value.toLocaleString("pt-BR")} ${unit}`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {series.map((s) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                yAxisId={s.yAxisId}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#grad-${s.dataKey})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
