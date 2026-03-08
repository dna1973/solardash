import { Zap, Sun, TrendingUp, AlertTriangle, Leaf, Battery, Plug } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { EnergyChart } from "@/components/EnergyChart";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { usePlants, useAlerts, useEnergyData } from "@/hooks/useSupabaseData";
import { plants as mockPlants, hourlyData, dailyData, monthlyData, alerts as mockAlerts, platformStats } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: dbPlants } = usePlants();
  const { data: dbAlerts } = useAlerts();
  const { data: dbEnergy } = useEnergyData();

  // Use DB data if available, fallback to mock
  const hasRealPlants = dbPlants && dbPlants.length > 0;
  const hasRealAlerts = dbAlerts && dbAlerts.length > 0;
  const hasRealEnergy = dbEnergy && dbEnergy.length > 0;

  // Map DB plants to display format
  const plants = hasRealPlants
    ? dbPlants.map((p) => ({
        id: p.id,
        name: p.name,
        location: p.location || "—",
        status: p.status as "online" | "offline" | "warning" | "maintenance",
        capacity_kwp: p.capacity_kwp,
        current_power_kw: 0,
        today_energy_kwh: 0,
        installation_date: p.installation_date || "—",
      }))
    : mockPlants;

  const alerts = hasRealAlerts
    ? dbAlerts.map((a) => ({
        id: a.id,
        type: a.type as "critical" | "warning" | "info",
        message: a.message,
        plant_name: (a as any).plants?.name || "—",
        resolved: a.resolved,
        timestamp: a.created_at,
      }))
    : mockAlerts;

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);

  // Build chart data from real energy_data if available
  const chartHourly = hasRealEnergy
    ? buildHourlyChart(dbEnergy)
    : hourlyData;

  // Stats
  const totalPlantsCount = plants.length;
  const plantsOnline = plants.filter((p) => p.status === "online").length;
  const activeAlertsCount = unresolvedAlerts.length;
  const currentPowerKw = hasRealPlants ? 0 : platformStats.currentPowerKw;
  const todayEnergyKwh = hasRealEnergy
    ? dbEnergy.reduce((s, e) => s + (e.energy_generated_kwh || 0), 0)
    : platformStats.todayEnergyKwh;
  const monthlyEnergyKwh = hasRealEnergy
    ? dbEnergy.reduce((s, e) => s + (e.energy_generated_kwh || 0), 0)
    : platformStats.monthlyEnergyKwh;
  const co2SavedTons = (todayEnergyKwh / 1000) * 0.42;

  const totalConsumptionToday = chartHourly.reduce((s, d) => s + d.consumption, 0);
  const totalConsumptionMonth = hasRealEnergy
    ? dbEnergy.reduce((s, e) => s + (e.energy_consumed_kwh || 0), 0)
    : dailyData.reduce((s, d) => s + d.consumption, 0);
  const avgConsumption = chartHourly.length > 0 ? Math.round(totalConsumptionToday / chartHourly.length) : 0;
  const peakConsumption = chartHourly.length > 0 ? Math.max(...chartHourly.map((d) => d.consumption)) : 0;
  const selfConsumptionRatio = totalConsumptionToday > 0
    ? Math.round((Math.min(todayEnergyKwh, totalConsumptionToday) / totalConsumptionToday) * 100)
    : 0;
  const gridInjected = Math.max(0, todayEnergyKwh - totalConsumptionToday);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema de monitoramento solar</p>
      </div>

      <Tabs defaultValue="generation" className="space-y-6">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="generation" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sun className="h-4 w-4" /> Geração
          </TabsTrigger>
          <TabsTrigger value="consumption" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Plug className="h-4 w-4" /> Consumo
          </TabsTrigger>
        </TabsList>

        {/* GERAÇÃO */}
        <TabsContent value="generation" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard title="Potência Atual" value={`${currentPowerKw.toFixed(0)} kW`} icon={Zap} variant="primary" trend={{ value: "+5.2% vs ontem", positive: true }} />
            <StatCard title="Energia Hoje" value={`${(todayEnergyKwh / 1000).toFixed(1)} MWh`} icon={Sun} variant="primary" />
            <StatCard title="Energia Mensal" value={`${(monthlyEnergyKwh / 1000).toFixed(0)} MWh`} icon={TrendingUp} variant="default" trend={{ value: "+8.3% vs mês anterior", positive: true }} />
            <StatCard title="Usinas Online" value={`${plantsOnline}/${totalPlantsCount}`} icon={Battery} variant="default" />
            <StatCard title="Alertas Ativos" value={String(activeAlertsCount)} icon={AlertTriangle} variant={activeAlertsCount > 0 ? "warning" : "default"} />
            <StatCard title="CO₂ Evitado" value={`${co2SavedTons.toFixed(1)} t`} icon={Leaf} variant="default" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <EnergyChart data={chartHourly} title="Geração por Hora — Hoje (kW)" dataKeys={["generation"]} />
            <EnergyChart data={hasRealEnergy ? chartHourly : dailyData} title="Geração Diária (kWh)" dataKeys={["generation"]} />
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
                      <th className="text-right py-2 font-medium">Capacidade</th>
                      <th className="text-center py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plants.map((plant) => (
                      <tr key={plant.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 font-medium">{plant.name}</td>
                        <td className="py-3 text-muted-foreground">{plant.location}</td>
                        <td className="py-3 text-right font-mono text-xs">{plant.capacity_kwp} kWp</td>
                        <td className="py-3 text-center"><PlantStatusBadge status={plant.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card p-5 shadow-card">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-energy-yellow" /> Alertas Recentes
              </h3>
              <div className="space-y-3">
                {unresolvedAlerts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum alerta ativo</p>
                )}
                {unresolvedAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg p-3 text-xs border-l-4 ${
                      alert.type === "critical"
                        ? "bg-energy-red-light border-l-destructive"
                        : alert.type === "warning"
                        ? "bg-energy-yellow-light border-l-energy-yellow"
                        : "bg-energy-blue-light border-l-energy-blue"
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

        {/* CONSUMO */}
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
            <EnergyChart data={chartHourly} title="Consumo por Hora — Hoje (kW)" dataKeys={["consumption"]} />
            <EnergyChart data={chartHourly} title="Geração vs Consumo — Hoje (kW)" dataKeys={["generation", "consumption"]} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <EnergyChart data={hasRealEnergy ? chartHourly : dailyData} title="Consumo Diário (kWh)" dataKeys={["consumption"]} />
            <EnergyChart data={hasRealEnergy ? chartHourly : monthlyData} title="Consumo Mensal (kWh)" dataKeys={["consumption", "generation"]} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function buildHourlyChart(energyData: any[]) {
  const byHour: Record<string, { generation: number; consumption: number }> = {};
  for (const e of energyData) {
    const hour = new Date(e.timestamp).getHours();
    const key = `${String(hour).padStart(2, "0")}:00`;
    if (!byHour[key]) byHour[key] = { generation: 0, consumption: 0 };
    byHour[key].generation += e.generation_power_kw || 0;
    byHour[key].consumption += e.consumption_power_kw || 0;
  }
  return Array.from({ length: 24 }, (_, i) => {
    const key = `${String(i).padStart(2, "0")}:00`;
    return { time: key, generation: Math.round(byHour[key]?.generation || 0), consumption: Math.round(byHour[key]?.consumption || 0) };
  });
}
