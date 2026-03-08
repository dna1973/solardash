import { usePlants } from "@/hooks/useSupabaseData";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { Sun, MapPin, Zap, Calendar, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Plants() {
  const navigate = useNavigate();
  const { data: dbPlants, isLoading } = usePlants();

  const plants = (dbPlants || []).map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location || "—",
    status: p.status as "online" | "offline" | "warning" | "maintenance",
    capacity_kwp: p.capacity_kwp,
    installation_date: p.installation_date || "—",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usinas Solares</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${plants.length} usinas cadastradas`}
          </p>
        </div>
        <button className="gradient-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          + Nova Usina
        </button>
      </div>

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
    </div>
  );
}
