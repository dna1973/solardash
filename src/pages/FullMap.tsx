import { useNavigate } from "react-router-dom";
import { PlantsMap } from "@/components/PlantsMap";
import { usePlants } from "@/hooks/useSupabaseData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2 } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function FullMap() {
  const navigate = useNavigate();
  const { data: dbPlants, isLoading } = usePlants();

  const plants = (dbPlants || []).map((p) => ({
    id: p.id,
    name: p.name,
    location: p.location || "—",
    status: p.status as "online" | "offline" | "warning" | "maintenance",
    capacity_kwp: p.capacity_kwp,
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-sm font-semibold flex items-center gap-2">
          <Maximize2 className="h-4 w-4" /> Mapa de Usinas
        </h1>
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(152,60%,42%)] inline-block" /> Online</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(45,100%,50%)] inline-block" /> Alerta</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-destructive inline-block" /> Offline</span>
        </div>
      </div>
      {/* Map fills remaining space */}
      <div className="flex-1">
        <PlantsMap plants={plants} onPlantClick={(id) => navigate(`/plants/${id}`)} />
      </div>
    </div>
  );
}
