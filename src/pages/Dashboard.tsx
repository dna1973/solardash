import { Zap, Sun, TrendingUp, AlertTriangle, Leaf, Battery, Plug, Loader2, MapIcon } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { EnergyChart } from "@/components/EnergyChart";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { PlantsMap } from "@/components/PlantsMap";
import { usePlants, useAlerts, useEnergyData } from "@/hooks/useSupabaseData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: dbPlants, isLoading: loadingPlants } = usePlants();
  const { data: dbAlerts, isLoading: loadingAlerts } = useAlerts();
  const { data: dbEnergy, isLoading: loadingEnergy } = useEnergyData();

  const isLoading = loadingPlants || loadingAlerts || loadingEnergy;

  const plants = (dbPlants || []).map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location || "—",
    status: p.status as "online" | "offline" | "warning" | "maintenance",
    capacity_kwp: p.capacity_kwp,
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  const alerts = (dbAlerts || []).map((a) => ({
    id: a.id,
    type: a.type as "critical" | "warning" | "info",
    message: a.message,
    plant_name: (a as any).plants?.name || "—",
    resolved: a.resolved,
    timestamp: a.created_at,
  }));

  const energyData = dbEnergy || [];
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);

  const chartHourly = buildHourlyChart(energyData);

  const totalPlantsCount = plants.length;
  const plantsOnline = plants.filter((p) => p.status === "online").length;
  const activeAlertsCount = unresolvedAlerts.length;
  const todayEnergyKwh = energyData.reduce((s, e) => s + (e.energy_generated_kwh || 0), 0);
  const currentPowerKw = energyData.length > 0 ? (energyData[energyData.length - 1]?.generation_power_kw || 0) : 0;
  const monthlyEnergyKwh = todayEnergyKwh; // will improve when more data is collected
  const co2SavedTons = (todayEnergyKwh / 1000) * 0.42;

  const totalConsumptionToday = chartHourly.reduce((s, d) => s + d.consumption, 0);
  const totalConsumptionMonth = energyData.reduce((s, e) => s + (e.energy_consumed_kwh || 0), 0);
  const avgConsumption = chartHourly.length > 0 ? Math.round(totalConsumptionToday / chartHourly.length) : 0;
  const peakConsumption = chartHourly.length > 0 ? Math.max(...chartHourly.map((d) => d.consumption)) : 0;
  const selfConsumptionRatio = totalConsumptionToday > 0
    ? Math.round((Math.min(todayEnergyKwh, totalConsumptionToday) / totalConsumptionToday) * 100)
    : 0;
  const gridInjected = Math.max(0, todayEnergyKwh - totalConsumptionToday);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "usuário";

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Olá, {firstName} 👋</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Visão geral do sistema de monitoramento solar</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="map" className="space-y-4 md:space-y-6">
          <TabsList className="bg-muted/60 w-full justify-start overflow-x-auto">
            <TabsTrigger value="map" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm">
              <MapIcon className="h-4 w-4" /> <span className="hidden xs:inline">Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="generation" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm">
              <Sun className="h-4 w-4" /> <span className="hidden xs:inline">Geração</span>
            </TabsTrigger>
            <TabsTrigger value="consumption" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs md:text-sm">
              <Plug className="h-4 w-4" /> <span className="hidden xs:inline">Consumo</span>
            </TabsTrigger>
          </TabsList>

          {/* GERAÇÃO */}
          <TabsContent value="generation" className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
              <StatCard title="Potência Atual" value={`${currentPowerKw.toFixed(0)} kW`} icon={Zap} variant="primary" />
              <StatCard title="Energia Hoje" value={`${(todayEnergyKwh / 1000).toFixed(1)} MWh`} icon={Sun} variant="primary" />
              <StatCard title="Energia Mensal" value={`${(monthlyEnergyKwh / 1000).toFixed(0)} MWh`} icon={TrendingUp} variant="default" />
              <StatCard title="Usinas Online" value={`${plantsOnline}/${totalPlantsCount}`} icon={Battery} variant="default" />
              <StatCard title="Alertas Ativos" value={String(activeAlertsCount)} icon={AlertTriangle} variant={activeAlertsCount > 0 ? "warning" : "default"} />
              <StatCard title="CO₂ Evitado" value={`${co2SavedTons.toFixed(1)} t`} icon={Leaf} variant="default" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <EnergyChart data={chartHourly} title="Geração por Hora — Hoje (kW)" dataKeys={["generation"]} />
              <EnergyChart data={chartHourly} title="Consumo por Hora — Hoje (kW)" dataKeys={["consumption"]} />
            </div>


            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="xl:col-span-2 rounded-xl bg-card p-5 shadow-card">
                <h3 className="text-sm font-semibold mb-4">Usinas Solares</h3>
                {plants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma usina cadastrada. Configure uma integração em Configurações.</p>
                ) : (
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
                          <tr
                            key={plant.id}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => navigate(`/dashboard/plants/${plant.id}`)}
                          >
                            <td className="py-3 font-medium">{plant.name}</td>
                            <td className="py-3 text-muted-foreground">{plant.location}</td>
                            <td className="py-3 text-right font-mono text-xs">{plant.capacity_kwp} kWp</td>
                            <td className="py-3 text-center"><PlantStatusBadge status={plant.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card p-5 shadow-card">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-energy-yellow" /> Alertas Recentes
                </h3>
                <div className="space-y-3">
                  {unresolvedAlerts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum alerta ativo ✓</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
              <StatCard title="Consumo Atual" value={`${avgConsumption} kW`} icon={Plug} variant="default" />
              <StatCard title="Consumo Hoje" value={`${(totalConsumptionToday / 1000).toFixed(1)} MWh`} icon={Zap} variant="default" />
              <StatCard title="Consumo Mensal" value={`${(totalConsumptionMonth / 1000).toFixed(0)} MWh`} icon={TrendingUp} variant="default" />
              <StatCard title="Pico de Consumo" value={`${peakConsumption} kW`} icon={AlertTriangle} variant="warning" />
              <StatCard title="Autoconsumo" value={`${selfConsumptionRatio}%`} icon={Sun} variant="primary" />
              <StatCard title="Injetado na Rede" value={`${(gridInjected / 1000).toFixed(1)} MWh`} icon={Leaf} variant="default" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <EnergyChart data={chartHourly} title="Consumo por Hora — Hoje (kW)" dataKeys={["consumption"]} />
              <EnergyChart data={chartHourly} title="Geração vs Consumo — Hoje (kW)" dataKeys={["generation", "consumption"]} />
            </div>
          </TabsContent>

          {/* MAPA */}
          <TabsContent value="map" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              <StatCard title="Total de Usinas" value={String(totalPlantsCount)} icon={Battery} variant="default" />
              <StatCard title="Online" value={String(plantsOnline)} icon={Sun} variant="primary" />
              <StatCard title="Offline" value={String(plants.filter(p => p.status === "offline").length)} icon={AlertTriangle} variant={plants.some(p => p.status === "offline") ? "warning" : "default"} />
              <StatCard title="Com Coordenadas" value={String(plants.filter(p => p.latitude != null).length)} icon={MapIcon} variant="default" />
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Usinas em Pernambuco</h3>
                <button onClick={() => navigate("/dashboard/map")} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <MapIcon className="h-3.5 w-3.5" /> Tela cheia
                </button>
              </div>
              <div className="h-[300px] md:h-[500px] rounded-lg overflow-hidden border border-border">
                <PlantsMap plants={plants} onPlantClick={(id) => navigate(`/plants/${id}`)} />
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" /> Online</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive inline-block" /> Offline</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-energy-orange inline-block" /> Alerta</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-energy-blue inline-block" /> Manutenção</span>
              </div>
            </motion.div>

            {/* Plant list below map */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card p-5 shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 font-medium">Usina</th>
                      <th className="text-left py-2 font-medium">Local</th>
                      <th className="text-right py-2 font-medium">Capacidade</th>
                      <th className="text-center py-2 font-medium">Coordenadas</th>
                      <th className="text-center py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plants.map((plant) => (
                      <tr key={plant.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/plants/${plant.id}`)}>
                        <td className="py-3 font-medium">{plant.name}</td>
                        <td className="py-3 text-muted-foreground">{plant.location}</td>
                        <td className="py-3 text-right font-mono text-xs">{plant.capacity_kwp} kWp</td>
                        <td className="py-3 text-center font-mono text-xs text-muted-foreground">
                          {plant.latitude != null ? `${plant.latitude.toFixed(4)}, ${plant.longitude?.toFixed(4)}` : "—"}
                        </td>
                        <td className="py-3 text-center"><PlantStatusBadge status={plant.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      )}
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
