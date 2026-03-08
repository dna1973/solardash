import { usePlants, useAlerts } from "@/hooks/useSupabaseData";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { Sun, MapPin, Calendar, Loader2, Factory, Wrench, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Alerts from "./Alerts";

export default function Plants() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "usinas";
  const { data: dbPlants, isLoading } = usePlants();
  const { data: dbAlerts } = useAlerts();

  const activeAlertCount = (dbAlerts || []).filter((a) => !a.resolved).length;

  const plants = (dbPlants || []).map((p: any) => {
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
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usinas Solares</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${plants.length} usinas cadastradas`}
          </p>
        </div>
        {activeTab === "usinas" && (
          <button className="gradient-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
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

        <TabsContent value="usinas" className="mt-6">
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {plants.map((plant, i) => (
                <motion.div
                  key={plant.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/plants/${plant.id}`)}
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
