import { EnergyChart } from "@/components/EnergyChart";
import { monthlyData, platformStats } from "@/data/mockData";
import { FileBarChart, Download, Leaf, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function Reports() {
  const monthlyGen = platformStats.monthlyEnergyKwh;
  const estimatedSavings = monthlyGen * 0.75 / 100; // R$/kWh simplified
  const co2Monthly = monthlyGen * 0.42 / 1000; // tons

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
          { icon: Zap, label: "Energia Gerada (mês)", value: `${(monthlyGen / 1000).toFixed(0)} MWh`, color: "text-primary" },
          { icon: TrendingUp, label: "Energia Injetada", value: `${((monthlyGen - platformStats.monthlyEnergyKwh * 0.6) / 1000).toFixed(0)} MWh`, color: "text-energy-blue" },
          { icon: FileBarChart, label: "Economia Estimada", value: `R$ ${estimatedSavings.toFixed(0)}`, color: "text-energy-yellow" },
          { icon: Leaf, label: "CO₂ Evitado (mês)", value: `${co2Monthly.toFixed(0)} ton`, color: "text-primary" },
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

      <EnergyChart data={monthlyData} title="Geração vs Consumo — Últimos 7 Meses (kWh)" height={350} />
    </div>
  );
}
