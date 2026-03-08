import { Zap, Sun, TrendingUp, AlertTriangle, Leaf, Battery, Plug } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { EnergyChart } from "@/components/EnergyChart";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { platformStats, plants, hourlyData, dailyData, monthlyData, alerts } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function Dashboard() {
  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  // Derive consumption-specific stats
  const totalConsumptionToday = hourlyData.reduce((sum, d) => sum + d.consumption, 0);
  const totalConsumptionMonth = dailyData.reduce((sum, d) => sum + d.consumption, 0);
  const avgConsumption = Math.round(totalConsumptionToday / 24);
  const peakConsumption = Math.max(...hourlyData.map(d => d.consumption));
  const selfConsumptionRatio = Math.round(
    (Math.min(platformStats.todayEnergyKwh, totalConsumptionToday) / totalConsumptionToday) * 100
  );
  const gridInjected = Math.max(0, platformStats.todayEnergyKwh - totalConsumptionToday);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema de monitoramento solar</p>
      </div>

      <Tabs defaultValue="generation" className="space-y-6">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="generation" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sun className="h-4 w-4" />
            Geração
          </TabsTrigger>
          <TabsTrigger value="consumption" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Plug className="h-4 w-4" />
            Consumo
          </TabsTrigger>
        </TabsList>

        {/* ===== ABA GERAÇÃO ===== */}
        <TabsContent value="generation" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard title="Potência Atual" value={`${platformStats.currentPowerKw.toFixed(0)} kW`} icon={Zap} variant="primary" trend={{ value: "+5.2% vs ontem", positive: true }} />
            <StatCard title="Energia Hoje" value={`${(platformStats.todayEnergyKwh / 1000).toFixed(1)} MWh`} icon={Sun} variant="primary" />
            <StatCard title="Energia Mensal" value={`${(platformStats.monthlyEnergyKwh / 1000).toFixed(0)} MWh`} icon={TrendingUp} variant="default" trend={{ value: "+8.3% vs mês anterior", positive: true }} />
            <StatCard title="Usinas Online" value={`${platformStats.plantsOnline}/${platformStats.totalPlants}`} icon={Battery} variant="default" />
            <StatCard title="Alertas Ativos" value={String(platformStats.activeAlerts)} icon={AlertTriangle} variant={platformStats.activeAlerts > 0 ? "warning" : "default"} />
            <StatCard title="CO₂ Evitado" value={`${(platformStats.co2SavedTons / 1000).toFixed(1)} mil t`} icon={Leaf} variant="default" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <EnergyChart data={hourlyData} title="Geração por Hora — Hoje (kW)" dataKeys={["generation"]} />
            <EnergyChart data={dailyData} title="Geração Diária — Março 2026 (kWh)" dataKeys={["generation"]} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
        </TabsContent>

        {/* ===== ABA CONSUMO ===== */}
        <TabsContent value="consumption" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard title="Consumo Atual" value={`${avgConsumption} kW`} icon={Plug} variant="default" />
            <StatCard title="Consumo Hoje" value={`${(totalConsumptionToday / 1000).toFixed(1)} MWh`} icon={Zap} variant="default" />
            <StatCard title="Consumo Mensal" value={`${(totalConsumptionMonth / 1000).toFixed(0)} MWh`} icon={TrendingUp} variant="default" />
            <StatCard title="Pico de Consumo" value={`${peakConsumption} kW`} icon={AlertTriangle} variant="warning" />
            <StatCard title="Autoconsumo" value={`${selfConsumptionRatio}%`} icon={Sun} variant="primary" />
            <StatCard title="Injetado na Rede" value={`${(gridInjected / 1000).toFixed(1)} MWh`} icon={Leaf} variant="default" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <EnergyChart data={hourlyData} title="Consumo por Hora — Hoje (kW)" dataKeys={["consumption"]} />
            <EnergyChart data={hourlyData} title="Geração vs Consumo — Hoje (kW)" dataKeys={["generation", "consumption"]} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <EnergyChart data={dailyData} title="Consumo Diário — Março 2026 (kWh)" dataKeys={["consumption"]} />
            <EnergyChart data={monthlyData} title="Consumo Mensal — Últimos 7 meses (kWh)" dataKeys={["consumption", "generation"]} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
