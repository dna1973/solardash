import { useState, useMemo } from "react";
import { usePlants, useAlerts } from "@/hooks/useSupabaseData";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { Sun, MapPin, Calendar, Loader2, Factory, Wrench, AlertTriangle, Search, Filter, X } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Alerts from "./Alerts";

export default function Plants() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "usinas";
  const { data: dbPlants, isLoading } = usePlants();
  const { data: dbAlerts } = useAlerts();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterManufacturer, setFilterManufacturer] = useState("all");
  const [filterIntegrator, setFilterIntegrator] = useState("all");

  const activeAlertCount = (dbAlerts || []).filter((a) => !a.resolved).length;

  const plants = useMemo(() => (dbPlants || []).map((p: any) => {
    const devices = p.devices || [];
    const manufacturers = [...new Set(devices.map((d: any) => d.manufacturer).filter(Boolean))];
    return {
      id: p.id,
      name: p.name,
      location: p.location || "—",
      status: p.status as "online" | "offline" | "warning" | "maintenance",
      capacity_kwp: p.capacity_kwp,
      installation_date: p.installation_date || "—",
      manufacturer: manufacturers.join(", ") || "—",
      integrator: p.integrator || "—",
    };
  }), [dbPlants]);

  const uniqueManufacturers = useMemo(() =>
    [...new Set(plants.map((p) => p.manufacturer).filter((m) => m !== "—"))].sort(),
    [plants]
  );

  const uniqueIntegrators = useMemo(() =>
    [...new Set(plants.map((p) => p.integrator).filter((i) => i !== "—"))].sort(),
    [plants]
  );

  const filteredPlants = useMemo(() => {
    return plants.filter((p) => {
      const matchSearch = search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.location.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || p.status === filterStatus;
      const matchManufacturer = filterManufacturer === "all" || p.manufacturer.includes(filterManufacturer);
      const matchIntegrator = filterIntegrator === "all" || p.integrator === filterIntegrator;
      return matchSearch && matchStatus && matchManufacturer && matchIntegrator;
    });
  }, [plants, search, filterStatus, filterManufacturer, filterIntegrator]);

  const hasActiveFilters = search !== "" || filterStatus !== "all" || filterManufacturer !== "all" || filterIntegrator !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterManufacturer("all");
    setFilterIntegrator("all");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Usinas Solares</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${plants.length} usinas cadastradas`}
          </p>
        </div>
        {activeTab === "usinas" && (
          <button className="gradient-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity w-full sm:w-auto">
            + Nova Usina
          </button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
        <TabsList>
          <TabsTrigger value="usinas" className="gap-2">
            <Sun className="h-4 w-4" />
            Usinas
          </TabsTrigger>
          <TabsTrigger value="alertas" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas
            {activeAlertCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold h-5 min-w-5 px-1">
                {activeAlertCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usinas" className="mt-4 md:mt-6 space-y-4">
          {/* Filters */}
          {!isLoading && plants.length > 0 && (
            <div className="rounded-xl bg-card p-3 md:p-4 shadow-card space-y-3">
              <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 ml-auto" onClick={clearFilters}>
                    <X className="h-3 w-3" /> Limpar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou local..."
                    className="pl-9 h-9 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="warning">Alerta</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterManufacturer} onValueChange={setFilterManufacturer}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Fabricante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os fabricantes</SelectItem>
                    {uniqueManufacturers.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterIntegrator} onValueChange={setFilterIntegrator}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Integrador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os integradores</SelectItem>
                    {uniqueIntegrators.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{filteredPlants.length} de {plants.length} usinas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {filterStatus !== "all" && (
                      <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => setFilterStatus("all")}>
                        {filterStatus} <X className="h-2.5 w-2.5" />
                      </Badge>
                    )}
                    {filterManufacturer !== "all" && (
                      <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => setFilterManufacturer("all")}>
                        {filterManufacturer} <X className="h-2.5 w-2.5" />
                      </Badge>
                    )}
                    {filterIntegrator !== "all" && (
                      <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={() => setFilterIntegrator("all")}>
                        {filterIntegrator} <X className="h-2.5 w-2.5" />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Plants grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : plants.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Sun className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Nenhuma usina cadastrada.</p>
              <p className="text-xs mt-1">Configure uma integração em Configurações para sincronizar suas usinas.</p>
            </div>
          ) : filteredPlants.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma usina encontrada</p>
              <p className="text-xs mt-1">Tente ajustar os filtros</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPlants.map((plant, i) => (
                <motion.div
                  key={plant.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/dashboard/plants/${plant.id}`)}
                  className="rounded-xl bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-energy-green-light">
                        <Sun className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{plant.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {plant.location}
                        </div>
                      </div>
                    </div>
                    <PlantStatusBadge status={plant.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-muted p-2.5">
                      <p className="text-muted-foreground">Capacidade</p>
                      <p className="font-mono font-semibold mt-0.5">{plant.capacity_kwp} kWp</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2.5">
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-mono font-semibold mt-0.5 capitalize">{plant.status}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2.5">
                      <p className="text-muted-foreground flex items-center gap-1"><Factory className="h-3 w-3" />Fabricante</p>
                      <p className="font-semibold mt-0.5 truncate">{plant.manufacturer}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-2.5">
                      <p className="text-muted-foreground flex items-center gap-1"><Wrench className="h-3 w-3" />Integrador</p>
                      <p className="font-semibold mt-0.5 truncate">{plant.integrator}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {plant.installation_date}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alertas" className="mt-6">
          <Alerts embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
