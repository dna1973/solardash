import { useState, useMemo, useEffect } from "react";
import { Zap, Sun, TrendingUp, AlertTriangle, Leaf, Battery, Plug, Loader2, MapIcon, Calendar, ChevronLeft, ChevronRight, Filter, Droplets, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WaterBarChart } from "@/components/WaterBarChart";
import { StatCard } from "@/components/StatCard";
import { EnergyChart } from "@/components/EnergyChart";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { PlantsMap } from "@/components/PlantsMap";
import { usePlants, useAlerts, useEnergyData, EnergyPeriod } from "@/hooks/useSupabaseData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format, subDays, addDays, subWeeks, addWeeks, subMonths, addMonths, subYears, addYears, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface WaterBillDashboard {
  id: string;
  property_name: string | null;
  account_number: string | null;
  reference_month: string | null;
  consumption_m3: number | null;
  water_value: number | null;
  sewer_value: number | null;
  total_value: number | null;
}

const PERIOD_OPTIONS: { value: EnergyPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

function getPeriodLabel(period: EnergyPeriod, date: Date): string {
  switch (period) {
    case "today":
    case "yesterday":
    case "custom":
      return format(date, "dd 'de' MMMM", { locale: ptBR });
    case "week":
      return `Semana de ${format(date, "dd/MM", { locale: ptBR })}`;
    case "month":
      return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    case "year":
      return format(date, "yyyy");
    default:
      return format(date, "dd/MM/yyyy");
  }
}

function navigateDate(period: EnergyPeriod, date: Date, direction: "prev" | "next"): Date {
  const fn = direction === "prev" ? { day: subDays, week: subWeeks, month: subMonths, year: subYears } : { day: addDays, week: addWeeks, month: addMonths, year: addYears };
  switch (period) {
    case "today":
    case "yesterday":
    case "custom":
      return direction === "prev" ? subDays(date, 1) : addDays(date, 1);
    case "week":
      return direction === "prev" ? subWeeks(date, 1) : addWeeks(date, 1);
    case "month":
      return direction === "prev" ? subMonths(date, 1) : addMonths(date, 1);
    case "year":
      return direction === "prev" ? subYears(date, 1) : addYears(date, 1);
    default:
      return date;
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("map");
  const [period, setPeriod] = useState<EnergyPeriod>("today");
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [selectedPlantId, setSelectedPlantId] = useState<string>("all");

  // Water tab state
  const [waterBills, setWaterBills] = useState<WaterBillDashboard[]>([]);
  const [waterLoading, setWaterLoading] = useState(false);
  const [waterYear, setWaterYear] = useState<string>(String(new Date().getFullYear()));
  const [waterMonth, setWaterMonth] = useState<string>("all");
  const [waterProperty, setWaterProperty] = useState<string>("all");

  // Water location name mapping (account_number → location_name)
  const [waterLocationMap, setWaterLocationMap] = useState<Record<string, string>>({});

  const { data: dbPlants, isLoading: loadingPlants } = usePlants();
  const { data: dbAlerts, isLoading: loadingAlerts } = useAlerts();
  const { data: dbEnergy, isLoading: loadingEnergy } = useEnergyData(
    selectedPlantId === "all" ? undefined : selectedPlantId,
    period,
    customDate
  );

  // Fetch water bills + location mapping
  useEffect(() => {
    const fetchWaterData = async () => {
      setWaterLoading(true);

      // Fetch water location mapping
      const { data: locData } = await supabase
        .from("property_locations")
        .select("id, water_account_number, location_name")
        .not("water_account_number", "is", null)
        .order("location_name");
      if (locData) {
        const map: Record<string, string> = {};
        (locData as any[]).forEach((r: any) => {
          if (r.water_account_number) map[r.water_account_number] = r.location_name;
        });
        setWaterLocationMap(map);
      }

      // Fetch water bills
      const { data, error } = await supabase
        .from("water_bills")
        .select("id, property_name, account_number, reference_month, consumption_m3, water_value, sewer_value, total_value")
        .order("reference_month", { ascending: false });
      if (!error && data) setWaterBills(data as WaterBillDashboard[]);
      setWaterLoading(false);
    };
    fetchWaterData();
  }, []);

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

  const chartData = useMemo(() => {
    if (period === "today" || period === "yesterday" || period === "custom") {
      return buildHourlyChart(energyData);
    }
    if (period === "week") {
      return buildDailyChart(energyData);
    }
    if (period === "month") {
      return buildDailyChart(energyData);
    }
    if (period === "year") {
      return buildMonthlyChart(energyData);
    }
    return buildHourlyChart(energyData);
  }, [energyData, period]);

  const totalPlantsCount = plants.length;
  const plantsOnline = plants.filter((p) => p.status === "online").length;
  const activeAlertsCount = unresolvedAlerts.length;
  const totalEnergyKwh = energyData.reduce((s, e) => s + (e.energy_generated_kwh || 0), 0);
  const currentPowerKw = energyData.length > 0 ? (energyData[energyData.length - 1]?.generation_power_kw || 0) : 0;
  const co2SavedTons = (totalEnergyKwh / 1000) * 0.42;

  const totalConsumption = energyData.reduce((s, e) => s + (e.energy_consumed_kwh || 0), 0);
  const avgConsumption = chartData.length > 0 ? Math.round(totalConsumption / chartData.length) : 0;
  const peakConsumption = chartData.length > 0 ? Math.max(...chartData.map((d) => d.consumption)) : 0;
  const selfConsumptionRatio = totalConsumption > 0
    ? Math.round((Math.min(totalEnergyKwh, totalConsumption) / totalConsumption) * 100)
    : 0;
  const gridInjected = Math.max(0, totalEnergyKwh - totalConsumption);

  // Water data computations
  const waterYears = useMemo(() => {
    const years = new Set<string>();
    waterBills.forEach((b) => {
      if (b.reference_month) {
        const match = b.reference_month.match(/(\d{4})/);
        if (match) years.add(match[1]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [waterBills]);

  const waterProperties = useMemo(() => {
    const props = new Set<string>();
    waterBills.forEach((b) => {
      if (b.property_name) props.add(b.property_name);
    });
    return Array.from(props).sort();
  }, [waterBills]);

  const MONTHS_MAP: Record<string, string> = {
    "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
    "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
    "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
  };

  const filteredWaterBills = useMemo(() => {
    return waterBills.filter((b) => {
      if (waterYear !== "all" && b.reference_month && !b.reference_month.includes(waterYear)) return false;
      if (waterMonth !== "all" && b.reference_month) {
        const monthMatch = b.reference_month.match(/(\d{2})\/\d{4}/);
        if (monthMatch && monthMatch[1] !== waterMonth) return false;
      }
      if (waterProperty !== "all" && b.property_name !== waterProperty) return false;
      return true;
    });
  }, [waterBills, waterYear, waterMonth, waterProperty]);

  const waterStats = useMemo(() => {
    const totalM3 = filteredWaterBills.reduce((s, b) => s + (b.consumption_m3 || 0), 0);
    const totalValue = filteredWaterBills.reduce((s, b) => s + (b.total_value || 0), 0);
    const totalWater = filteredWaterBills.reduce((s, b) => s + (b.water_value || 0), 0);
    const totalSewer = filteredWaterBills.reduce((s, b) => s + (b.sewer_value || 0), 0);
    const avgM3 = filteredWaterBills.length > 0 ? totalM3 / filteredWaterBills.length : 0;
    return { totalM3, totalValue, totalWater, totalSewer, avgM3, count: filteredWaterBills.length };
  }, [filteredWaterBills]);

  const waterChartData = useMemo(() => {
    const byMonth: Record<string, { consumption: number; value: number }> = {};
    filteredWaterBills.forEach((b) => {
      const key = b.reference_month || "N/A";
      if (!byMonth[key]) byMonth[key] = { consumption: 0, value: 0 };
      byMonth[key].consumption += b.consumption_m3 || 0;
      byMonth[key].value += b.total_value || 0;
    });
    return Object.entries(byMonth)
      .map(([time, vals]) => ({ time, generation: Math.round(vals.consumption), consumption: Math.round(vals.value) }))
      .reverse();
  }, [filteredWaterBills]);

  const waterByLocation = useMemo(() => {
    const byLoc: Record<string, number> = {};
    filteredWaterBills.forEach((b) => {
      const loc = b.property_name || "Sem imóvel";
      byLoc[loc] = (byLoc[loc] || 0) + (b.consumption_m3 || 0);
    });
    return Object.entries(byLoc).map(([name, value]) => ({ name, value }));
  }, [filteredWaterBills]);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "usuário";

  const handlePeriodChange = (newPeriod: EnergyPeriod) => {
    setPeriod(newPeriod);
    setCustomDate(new Date());
  };

  const handleDateNav = (direction: "prev" | "next") => {
    const newDate = navigateDate(period, customDate, direction);
    setCustomDate(newDate);
    // If navigating away from "today", switch to custom
    if (period === "today" && !isToday(newDate)) {
      setPeriod("custom");
    }
    if (period === "yesterday") {
      setPeriod("custom");
    }
  };

  const periodLabel = getPeriodLabel(period, customDate);
  const chartTimeLabel = period === "today" || period === "yesterday" || period === "custom" ? "Hora" : period === "year" ? "Mês" : "Dia";
  const energyLabel = period === "today" || period === "yesterday" || period === "custom" ? "Hoje" : period === "week" ? "Semana" : period === "month" ? "Mês" : "Ano";

  const PlantFilter = () => (
    <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
      <SelectTrigger className="w-[220px] h-9 text-xs">
        <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
        <SelectValue placeholder="Todas as usinas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as usinas</SelectItem>
        {plants.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const PeriodFilter = () => (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handlePeriodChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              (period === opt.value || (period === "custom" && opt.value === "today"))
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDateNav("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium text-muted-foreground min-w-[120px] text-center capitalize flex items-center gap-1.5 justify-center">
          <Calendar className="h-3.5 w-3.5" />
          {periodLabel}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDateNav("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <PlantFilter />
    </div>
  );

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="map" className="gap-1.5 text-xs md:text-sm">
              <MapIcon className="h-4 w-4" /> Mapa
            </TabsTrigger>
            <TabsTrigger value="generation" className="gap-1.5 text-xs md:text-sm">
              <Sun className="h-4 w-4" /> Geração
            </TabsTrigger>
            <TabsTrigger value="consumption" className="gap-1.5 text-xs md:text-sm">
              <Plug className="h-4 w-4" /> Energia
            </TabsTrigger>
            <TabsTrigger value="water" className="gap-1.5 text-xs md:text-sm">
              <Droplets className="h-4 w-4" /> Água
              {waterStats.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{waterStats.count}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* GERAÇÃO */}
          <TabsContent value="generation" className="space-y-6">
            <PeriodFilter />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
              <StatCard title="Potência Atual" value={`${currentPowerKw.toFixed(0)} kW`} icon={Zap} variant="primary" />
              <StatCard title={`Energia ${energyLabel}`} value={`${(totalEnergyKwh / 1000).toFixed(1)} MWh`} icon={Sun} variant="primary" />
              <StatCard title="Energia Total" value={`${(totalEnergyKwh / 1000).toFixed(0)} MWh`} icon={TrendingUp} variant="default" />
              <StatCard title="Usinas Online" value={`${plantsOnline}/${totalPlantsCount}`} icon={Battery} variant="default" />
              <StatCard title="Alertas Ativos" value={String(activeAlertsCount)} icon={AlertTriangle} variant={activeAlertsCount > 0 ? "warning" : "default"} />
              <StatCard title="CO₂ Evitado" value={`${co2SavedTons.toFixed(1)} t`} icon={Leaf} variant="default" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <EnergyChart data={chartData} title={`Geração por ${chartTimeLabel} (kW)`} dataKeys={["generation"]} />
              <EnergyChart data={chartData} title={`Consumo por ${chartTimeLabel} (kW)`} dataKeys={["consumption"]} />
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
            <PeriodFilter />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
              <StatCard title="Consumo Atual" value={`${avgConsumption} kW`} icon={Plug} variant="default" />
              <StatCard title={`Consumo ${energyLabel}`} value={`${(totalConsumption / 1000).toFixed(1)} MWh`} icon={Zap} variant="default" />
              <StatCard title="Consumo Total" value={`${(totalConsumption / 1000).toFixed(0)} MWh`} icon={TrendingUp} variant="default" />
              <StatCard title="Pico de Consumo" value={`${peakConsumption} kW`} icon={AlertTriangle} variant="warning" />
              <StatCard title="Autoconsumo" value={`${selfConsumptionRatio}%`} icon={Sun} variant="primary" />
              <StatCard title="Injetado na Rede" value={`${(gridInjected / 1000).toFixed(1)} MWh`} icon={Leaf} variant="default" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              <EnergyChart data={chartData} title={`Consumo por ${chartTimeLabel} (kW)`} dataKeys={["consumption"]} />
              <EnergyChart data={chartData} title={`Geração vs Consumo — ${energyLabel} (kW)`} dataKeys={["generation", "consumption"]} />
            </div>
          </TabsContent>

          {/* ÁGUA */}
          <TabsContent value="water" className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={waterYear} onValueChange={setWaterYear}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {waterYears.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={waterMonth} onValueChange={setWaterMonth}>
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {Object.entries(MONTHS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={waterProperty} onValueChange={setWaterProperty}>
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <Droplets className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Imóvel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os imóveis</SelectItem>
                  {waterProperties.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {waterLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
                  <StatCard title="Faturas" value={String(waterStats.count)} icon={Droplets} variant="default" />
                  <StatCard title="Consumo Total" value={`${waterStats.totalM3.toFixed(0)} m³`} icon={Droplets} variant="primary" />
                  <StatCard title="Média/Fatura" value={`${waterStats.avgM3.toFixed(1)} m³`} icon={TrendingUp} variant="default" />
                  <StatCard title="Valor Água" value={`R$ ${waterStats.totalWater.toFixed(0)}`} icon={DollarSign} variant="default" />
                  <StatCard title="Valor Esgoto" value={`R$ ${waterStats.totalSewer.toFixed(0)}`} icon={DollarSign} variant="default" />
                  <StatCard title="Valor Total" value={`R$ ${waterStats.totalValue.toFixed(0)}`} icon={DollarSign} variant="warning" />
                </div>

                {waterChartData.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                    <EnergyChart data={waterChartData} title="Consumo de Água por Mês (m³)" dataKeys={["generation"]} />
                    {waterByLocation.length > 0 && (
                      <WaterBarChart data={waterByLocation} title="Consumo por Imóvel (m³)" unit="m³" />
                    )}
                  </div>
                )}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card p-5 shadow-card">
                  <h3 className="text-sm font-semibold mb-4">Faturas de Água</h3>
                  {filteredWaterBills.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma fatura de água encontrada para os filtros selecionados.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="text-left py-2 font-medium">Imóvel</th>
                            <th className="text-left py-2 font-medium">Referência</th>
                            <th className="text-right py-2 font-medium">Consumo (m³)</th>
                            <th className="text-right py-2 font-medium">Água</th>
                            <th className="text-right py-2 font-medium">Esgoto</th>
                            <th className="text-right py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWaterBills.slice(0, 10).map((bill) => (
                            <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-3 font-medium">{bill.property_name || "—"}</td>
                              <td className="py-3 text-muted-foreground">{bill.reference_month || "—"}</td>
                              <td className="py-3 text-right font-mono text-xs">{bill.consumption_m3?.toFixed(0) || "—"}</td>
                              <td className="py-3 text-right font-mono text-xs">R$ {bill.water_value?.toFixed(2) || "—"}</td>
                              <td className="py-3 text-right font-mono text-xs">R$ {bill.sewer_value?.toFixed(2) || "—"}</td>
                              <td className="py-3 text-right font-mono text-xs font-semibold">R$ {bill.total_value?.toFixed(2) || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              </>
            )}
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
                <PlantsMap plants={plants} onPlantClick={(id) => navigate(`/dashboard/plants/${id}`)} />
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary inline-block" /> Online</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive inline-block" /> Offline</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-energy-orange inline-block" /> Alerta</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-energy-blue inline-block" /> Manutenção</span>
              </div>
            </motion.div>

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
                      <tr key={plant.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/plants/${plant.id}`)}>
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

function buildDailyChart(energyData: any[]) {
  const byDay: Record<string, { generation: number; consumption: number }> = {};
  for (const e of energyData) {
    const d = new Date(e.timestamp);
    const key = format(d, "dd/MM", { locale: ptBR });
    if (!byDay[key]) byDay[key] = { generation: 0, consumption: 0 };
    byDay[key].generation += e.energy_generated_kwh || 0;
    byDay[key].consumption += e.energy_consumed_kwh || 0;
  }
  return Object.entries(byDay).map(([time, vals]) => ({
    time,
    generation: Math.round(vals.generation),
    consumption: Math.round(vals.consumption),
  }));
}

function buildMonthlyChart(energyData: any[]) {
  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const byMonth: Record<number, { generation: number; consumption: number }> = {};
  for (const e of energyData) {
    const month = new Date(e.timestamp).getMonth();
    if (!byMonth[month]) byMonth[month] = { generation: 0, consumption: 0 };
    byMonth[month].generation += e.energy_generated_kwh || 0;
    byMonth[month].consumption += e.energy_consumed_kwh || 0;
  }
  return Array.from({ length: 12 }, (_, i) => ({
    time: MONTHS[i],
    generation: Math.round(byMonth[i]?.generation || 0),
    consumption: Math.round(byMonth[i]?.consumption || 0),
  }));
}
