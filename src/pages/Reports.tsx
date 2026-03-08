import { EnergyChart } from "@/components/EnergyChart";
import { FileBarChart, Download, Leaf, Zap, TrendingUp, Loader2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useEnergyData } from "@/hooks/useSupabaseData";
import { useMemo } from "react";

export default function Reports() {
  const { data: energyData = [], isLoading } = useEnergyData();

  const { monthlyChart, monthlyGen, injectedEnergy, estimatedSavings, co2Monthly } = useMemo(() => {
    if (energyData.length === 0) {
      return { monthlyChart: [], monthlyGen: 0, injectedEnergy: 0, estimatedSavings: 0, co2Monthly: 0 };
    }

    // Aggregate by month
    const monthMap = new Map<string, { generation: number; consumption: number }>();
    energyData.forEach((d) => {
      const date = new Date(d.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) || { generation: 0, consumption: 0 };
      entry.generation += (d.energy_generated_kwh || 0);
      entry.consumption += (d.energy_consumed_kwh || 0);
      monthMap.set(key, entry);
    });

    const sorted = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const monthlyChart = sorted.map(([key, val]) => {
      const [, m] = key.split("-");
      return {
        time: monthNames[parseInt(m, 10) - 1],
        generation: Math.round(val.generation),
        consumption: Math.round(val.consumption),
      };
    });

    const totalGen = sorted.reduce((sum, [, v]) => sum + v.generation, 0);
    const totalCon = sorted.reduce((sum, [, v]) => sum + v.consumption, 0);
    const months = sorted.length || 1;
    const avgMonthlyGen = totalGen / months;
    const injected = Math.max(0, totalGen - totalCon) / months;

    return {
      monthlyChart,
      monthlyGen: avgMonthlyGen,
      injectedEnergy: injected,
      estimatedSavings: avgMonthlyGen * 0.75 / 100,
      co2Monthly: avgMonthlyGen * 0.42 / 1000,
    };
  }, [energyData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasData = monthlyChart.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análise energética e exportação de dados</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 border text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> PDF
          </button>
          <button className="flex items-center gap-2 border text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: "Energia Gerada (mês)", value: hasData ? `${(monthlyGen / 1000).toFixed(1)} MWh` : "—", color: "text-primary" },
          { icon: TrendingUp, label: "Energia Injetada", value: hasData ? `${(injectedEnergy / 1000).toFixed(1)} MWh` : "—", color: "text-energy-blue" },
          { icon: FileBarChart, label: "Economia Estimada", value: hasData ? `R$ ${estimatedSavings.toFixed(0)}` : "—", color: "text-accent" },
          { icon: Leaf, label: "CO₂ Evitado (mês)", value: hasData ? `${co2Monthly.toFixed(1)} ton` : "—", color: "text-primary" },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-xl font-bold">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {hasData ? (
        <EnergyChart data={monthlyChart} title="Geração vs Consumo — Mensal (kWh)" height={350} />
      ) : (
        <div className="rounded-xl bg-card p-12 shadow-card flex flex-col items-center justify-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">Sem dados de energia</p>
          <p className="text-sm">Os dados aparecerão aqui após a primeira sincronização das usinas.</p>
        </div>
      )}
    </div>
  );
}
