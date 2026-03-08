import { Zap, Sun, TrendingUp, AlertTriangle, Leaf, Battery } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { EnergyChart } from "@/components/EnergyChart";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { platformStats, plants, hourlyData, dailyData, alerts } from "@/data/mockData";
import { motion } from "framer-motion";

export default function Dashboard() {
  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema de monitoramento solar</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Potência Atual" value={`${platformStats.currentPowerKw.toFixed(0)} kW`} icon={Zap} variant="primary" trend={{ value: "+5.2% vs ontem", positive: true }} />
        <StatCard title="Energia Hoje" value={`${(platformStats.todayEnergyKwh / 1000).toFixed(1)} MWh`} icon={Sun} variant="primary" />
        <StatCard title="Energia Mensal" value={`${(platformStats.monthlyEnergyKwh / 1000).toFixed(0)} MWh`} icon={TrendingUp} variant="default" trend={{ value: "+8.3% vs mês anterior", positive: true }} />
        <StatCard title="Usinas Online" value={`${platformStats.plantsOnline}/${platformStats.totalPlants}`} icon={Battery} variant="default" />
        <StatCard title="Alertas Ativos" value={String(platformStats.activeAlerts)} icon={AlertTriangle} variant={platformStats.activeAlerts > 0 ? "warning" : "default"} />
        <StatCard title="CO₂ Evitado" value={`${(platformStats.co2SavedTons / 1000).toFixed(1)} mil t`} icon={Leaf} variant="default" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <EnergyChart data={hourlyData} title="Geração vs Consumo — Hoje (kW)" />
        <EnergyChart data={dailyData} title="Geração vs Consumo — Março 2026 (kWh)" />
      </div>

      {/* Plants + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Plants Table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="xl:col-span-2 rounded-xl bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-4">Usinas Solares</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 font-medium">Usina</th>
                  <th className="text-left py-2 font-medium">Local</th>
                  <th className="text-right py-2 font-medium">Potência</th>
                  <th className="text-right py-2 font-medium">Hoje</th>
                  <th className="text-center py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {plants.map((plant) => (
                  <tr key={plant.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-medium">{plant.name}</td>
                    <td className="py-3 text-muted-foreground">{plant.location}</td>
                    <td className="py-3 text-right font-mono text-xs">{plant.current_power_kw.toFixed(1)} kW</td>
                    <td className="py-3 text-right font-mono text-xs">{(plant.today_energy_kwh / 1000).toFixed(1)} MWh</td>
                    <td className="py-3 text-center"><PlantStatusBadge status={plant.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-energy-yellow" />
            Alertas Recentes
          </h3>
          <div className="space-y-3">
            {unresolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg p-3 text-xs border-l-4 ${
                  alert.type === 'critical'
                    ? 'bg-energy-red-light border-l-destructive'
                    : alert.type === 'warning'
                    ? 'bg-energy-yellow-light border-l-energy-yellow'
                    : 'bg-energy-blue-light border-l-energy-blue'
                }`}
              >
                <p className="font-medium text-foreground">{alert.message}</p>
                <p className="text-muted-foreground mt-1">{alert.plant_name}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
