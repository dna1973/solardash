import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface EnergyChartProps {
  data: Array<{ time: string; generation: number; consumption: number }>;
  title: string;
  height?: number;
  dataKeys?: ("generation" | "consumption")[];
}

const COLORS = {
  generation: { stroke: "hsl(152, 60%, 42%)", gradientId: "genGrad" },
  consumption: { stroke: "hsl(210, 80%, 55%)", gradientId: "conGrad" },
};

const LABELS: Record<string, string> = {
  generation: "Geração",
  consumption: "Consumo",
};

export function EnergyChart({ data, title, height = 300, dataKeys = ["generation", "consumption"] }: EnergyChartProps) {
  return (
    <div className="rounded-xl bg-card p-3 md:p-5 shadow-card">
      <h3 className="text-xs md:text-sm font-semibold mb-3 md:mb-4">{title}</h3>
      <div className="h-[200px] md:h-auto">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="conGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 10%, 46%)' }} width={35} />
          <Tooltip
            contentStyle={{
              background: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(220, 13%, 90%)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value.toLocaleString('pt-BR')} kWh`, undefined]}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {dataKeys.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={LABELS[key]}
              stroke={COLORS[key].stroke}
              strokeWidth={2}
              fill={`url(#${COLORS[key].gradientId})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
