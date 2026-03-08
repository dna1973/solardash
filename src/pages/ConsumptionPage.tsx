import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Search, Zap, TrendingUp, DollarSign, BarChart3, MapPin, Plug, FileUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import { EnergyChart } from "@/components/EnergyChart";
import { BillImportDialog } from "@/components/BillImportDialog";
import { toast } from "sonner";

interface Property {
  id: string;
  name: string;
  address: string;
  type: "residential" | "commercial" | "industrial" | "rural";
  plant_name: string;
  monthly_consumption_kwh: number;
  monthly_generation_kwh: number;
  monthly_cost_brl: number;
  savings_brl: number;
  contract_demand_kw?: number;
  utility: string;
  status: "surplus" | "deficit" | "balanced";
}

const mockProperties: Property[] = [
  { id: "1", name: "Sede Administrativa", address: "Av. Paulista, 1000 - São Paulo, SP", type: "commercial", plant_name: "Usina Solar Campinas I", monthly_consumption_kwh: 12500, monthly_generation_kwh: 15200, monthly_cost_brl: 2800, savings_brl: 4200, contract_demand_kw: 75, utility: "CPFL Energia", status: "surplus" },
  { id: "2", name: "Galpão Industrial", address: "Rod. Anhanguera, km 42 - Campinas, SP", type: "industrial", plant_name: "Solar Park Ribeirão", monthly_consumption_kwh: 45000, monthly_generation_kwh: 38000, monthly_cost_brl: 18500, savings_brl: 12600, contract_demand_kw: 250, utility: "Elektro", status: "deficit" },
  { id: "3", name: "Filial Centro", address: "R. XV de Novembro, 250 - Curitiba, PR", type: "commercial", plant_name: "Usina Solar Curitiba", monthly_consumption_kwh: 8200, monthly_generation_kwh: 8100, monthly_cost_brl: 3200, savings_brl: 2900, contract_demand_kw: 50, utility: "Copel", status: "balanced" },
  { id: "4", name: "Residência Diretor", address: "R. das Palmeiras, 55 - Goiânia, GO", type: "residential", plant_name: "Parque Fotovoltaico Goiás", monthly_consumption_kwh: 850, monthly_generation_kwh: 1200, monthly_cost_brl: 180, savings_brl: 520, utility: "Enel GO", status: "surplus" },
  { id: "5", name: "Fazenda Agro Solar", address: "Zona Rural - Uberlândia, MG", type: "rural", plant_name: "Fazenda Solar MG", monthly_consumption_kwh: 22000, monthly_generation_kwh: 18500, monthly_cost_brl: 9800, savings_brl: 6200, contract_demand_kw: 120, utility: "CEMIG", status: "deficit" },
];

const typeLabels: Record<string, string> = {
  residential: "Residencial",
  commercial: "Comercial",
  industrial: "Industrial",
  rural: "Rural",
};

const typeColors: Record<string, string> = {
  residential: "bg-energy-blue-light text-energy-blue",
  commercial: "bg-energy-green-light text-primary",
  industrial: "bg-energy-yellow-light text-energy-orange",
  rural: "bg-muted text-muted-foreground",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  surplus: { label: "Excedente", color: "text-primary" },
  deficit: { label: "Déficit", color: "text-destructive" },
  balanced: { label: "Equilibrado", color: "text-energy-blue" },
};

// Mock hourly consumption data per property
const hourlyConsumption = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  generation: Math.round((i >= 6 && i <= 18 ? Math.sin(((i - 6) / 12) * Math.PI) : 0) * 45 * (0.85 + Math.random() * 0.15)),
  consumption: Math.round(15 + Math.random() * 20 + (i >= 8 && i <= 18 ? 25 : 0)),
}));

const monthlyHistory = [
  { time: "Out", generation: 14200, consumption: 12000 },
  { time: "Nov", generation: 15800, consumption: 12500 },
  { time: "Dez", generation: 16100, consumption: 13200 },
  { time: "Jan", generation: 15500, consumption: 13800 },
  { time: "Fev", generation: 14800, consumption: 12900 },
  { time: "Mar", generation: 15200, consumption: 12500 },
];

export default function ConsumptionPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = mockProperties.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.address.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || p.type === filterType;
    return matchSearch && matchType;
  });

  const totalConsumption = mockProperties.reduce((s, p) => s + p.monthly_consumption_kwh, 0);
  const totalGeneration = mockProperties.reduce((s, p) => s + p.monthly_generation_kwh, 0);
  const totalSavings = mockProperties.reduce((s, p) => s + p.savings_brl, 0);
  const totalCost = mockProperties.reduce((s, p) => s + p.monthly_cost_brl, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consumo por Imóvel</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de consumo e geração de energia por unidade consumidora
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
            <FileUp className="w-4 h-4" /> Importar Conta (OCR)
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2" size="sm">
                <Plus className="w-4 h-4" /> Novo Imóvel
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Imóvel</DialogTitle>
              <DialogDescription>Adicione uma nova unidade consumidora ao sistema</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Imóvel</Label>
                <Input placeholder="Ex: Sede Administrativa" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Endereço</Label>
                <Input placeholder="Endereço completo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residencial</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="rural">Rural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Concessionária</Label>
                  <Input placeholder="Ex: CPFL" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Demanda Contratada (kW)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <Button className="w-full gradient-primary">Cadastrar</Button>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Consumo Total Mensal" value={`${(totalConsumption / 1000).toFixed(1)} MWh`} icon={Zap} variant="default" />
        <StatCard title="Geração Total Mensal" value={`${(totalGeneration / 1000).toFixed(1)} MWh`} icon={TrendingUp} variant="primary" />
        <StatCard title="Economia Mensal" value={`R$ ${totalSavings.toLocaleString("pt-BR")}`} icon={DollarSign} variant="primary" trend={{ value: "+12% vs mês anterior", positive: true }} />
        <StatCard title="Custo Residual" value={`R$ ${totalCost.toLocaleString("pt-BR")}`} icon={BarChart3} variant="default" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar imóvel por nome ou endereço..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="residential">Residencial</SelectItem>
            <SelectItem value="commercial">Comercial</SelectItem>
            <SelectItem value="industrial">Industrial</SelectItem>
            <SelectItem value="rural">Rural</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((prop, i) => {
          const st = statusConfig[prop.status];
          const balance = prop.monthly_generation_kwh - prop.monthly_consumption_kwh;
          return (
            <motion.div
              key={prop.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer border-border/50"
                onClick={() => setSelectedProperty(prop)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{prop.name}</CardTitle>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {prop.address}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColors[prop.type]}`}>
                      {typeLabels[prop.type]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Consumo</p>
                      <p className="text-sm font-semibold font-mono">{(prop.monthly_consumption_kwh / 1000).toFixed(1)} MWh</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground">Geração</p>
                      <p className="text-sm font-semibold font-mono text-primary">{(prop.monthly_generation_kwh / 1000).toFixed(1)} MWh</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground">Economia: </span>
                      <span className="font-semibold text-primary">R$ {prop.savings_brl.toLocaleString("pt-BR")}</span>
                    </div>
                    <span className={`font-semibold ${st.color}`}>
                      {st.label} ({balance > 0 ? "+" : ""}{(balance / 1000).toFixed(1)} MWh)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2">
                    <span className="flex items-center gap-1"><Plug className="w-3 h-3" /> {prop.utility}</span>
                    <span>{prop.plant_name}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Property Detail Dialog */}
      <Dialog open={!!selectedProperty} onOpenChange={(open) => !open && setSelectedProperty(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedProperty && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <DialogTitle>{selectedProperty.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {selectedProperty.address}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Consumo</p>
                  <p className="text-sm font-bold font-mono">{(selectedProperty.monthly_consumption_kwh / 1000).toFixed(1)} MWh</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Geração</p>
                  <p className="text-sm font-bold font-mono text-primary">{(selectedProperty.monthly_generation_kwh / 1000).toFixed(1)} MWh</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Economia</p>
                  <p className="text-sm font-bold font-mono text-primary">R$ {selectedProperty.savings_brl.toLocaleString("pt-BR")}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Custo Atual</p>
                  <p className="text-sm font-bold font-mono">R$ {selectedProperty.monthly_cost_brl.toLocaleString("pt-BR")}</p>
                </div>
              </div>

              <Tabs defaultValue="daily" className="mt-4">
                <TabsList className="bg-muted/60">
                  <TabsTrigger value="daily">Hoje</TabsTrigger>
                  <TabsTrigger value="monthly">Mensal</TabsTrigger>
                </TabsList>
                <TabsContent value="daily" className="mt-3">
                  <EnergyChart data={hourlyConsumption} title="Consumo vs Geração — Hoje (kW)" height={250} />
                </TabsContent>
                <TabsContent value="monthly" className="mt-3">
                  <EnergyChart data={monthlyHistory} title="Histórico Mensal (kWh)" height={250} />
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="font-semibold text-muted-foreground">Detalhes</p>
                  <p><span className="text-muted-foreground">Tipo:</span> {typeLabels[selectedProperty.type]}</p>
                  <p><span className="text-muted-foreground">Concessionária:</span> {selectedProperty.utility}</p>
                  {selectedProperty.contract_demand_kw && (
                    <p><span className="text-muted-foreground">Demanda contratada:</span> {selectedProperty.contract_demand_kw} kW</p>
                  )}
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="font-semibold text-muted-foreground">Usina Vinculada</p>
                  <p className="font-medium">{selectedProperty.plant_name}</p>
                  <p className={`font-semibold ${statusConfig[selectedProperty.status].color}`}>
                    Status: {statusConfig[selectedProperty.status].label}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bill Import Dialog */}
      <BillImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => toast.success("Conta importada! Atualize a página para ver os dados.")}
      />
    </div>
  );
}
