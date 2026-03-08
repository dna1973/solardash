import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlantById, useDevicesByPlant, useAlertsByPlant, useEnergyData, useUpdatePlant } from "@/hooks/useSupabaseData";
import { useUserRole } from "@/hooks/useUserRole";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { PlantEditDialog } from "@/components/PlantEditDialog";
import { EnergyChart } from "@/components/EnergyChart";
import { ArrowLeft, Sun, MapPin, Zap, Calendar, Loader2, Cpu, AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: plant, isLoading: loadingPlant } = usePlantById(id!);
  const { data: devices, isLoading: loadingDevices } = useDevicesByPlant(id!);
  const { data: alerts } = useAlertsByPlant(id!);
  const { data: energyData } = useEnergyData(id);
  const { isGestor } = useUserRole();
  const updatePlant = useUpdatePlant();
  const [editOpen, setEditOpen] = useState(false);

  const activeAlerts = (alerts || []).filter((a) => !a.resolved);

  const chartData = (energyData || []).map((d) => ({
    time: format(new Date(d.timestamp), "dd/MM HH:mm"),
    generation: d.energy_generated_kwh || 0,
    consumption: d.energy_consumed_kwh || 0,
  }));

  const totalGenerated = (energyData || []).reduce((s, d) => s + (d.energy_generated_kwh || 0), 0);
  const totalConsumed = (energyData || []).reduce((s, d) => s + (d.energy_consumed_kwh || 0), 0);

  if (loadingPlant) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Usina não encontrada.</p>
        <button onClick={() => navigate("/plants")} className="text-primary underline mt-2 text-sm">
          Voltar para usinas
        </button>
      </div>
    );
  }

  const status = plant.status as "online" | "offline" | "warning" | "maintenance";

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <button
          onClick={() => navigate("/plants")}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-card shadow-card hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{plant.name}</h1>
            <PlantStatusBadge status={status} />
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <MapPin className="h-3.5 w-3.5" />
            {plant.location || "Sem localização"}
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatMini icon={<Zap className="h-4 w-4 text-primary" />} label="Capacidade" value={`${plant.capacity_kwp} kWp`} />
        <StatMini
          icon={<Sun className="h-4 w-4 text-energy-yellow" />}
          label="Geração Total"
          value={`${totalGenerated.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kWh`}
        />
        <StatMini
          icon={<Cpu className="h-4 w-4 text-energy-blue" />}
          label="Dispositivos"
          value={`${(devices || []).length}`}
        />
        <StatMini
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          label="Alertas Ativos"
          value={`${activeAlerts.length}`}
        />
      </motion.div>

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <EnergyChart data={chartData} title="Geração e Consumo" height={320} />
      </motion.div>

      {/* Bottom grid: Devices + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Devices */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl bg-card p-5 shadow-card"
        >
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            Dispositivos Vinculados
          </h3>
          {loadingDevices ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
          ) : (devices || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum dispositivo vinculado.</p>
          ) : (
            <div className="space-y-3">
              {(devices || []).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <div>
                    <p className="text-xs font-semibold">{d.manufacturer} {d.model}</p>
                    <p className="text-[11px] text-muted-foreground">SN: {d.serial_number} · {d.device_type}</p>
                  </div>
                  <PlantStatusBadge status={d.status as "online" | "offline" | "warning" | "maintenance"} />
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-card p-5 shadow-card"
        >
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Alertas
          </h3>
          {(alerts || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum alerta registrado.</p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {(alerts || []).map((a) => (
                <div
                  key={a.id}
                  className={`flex items-start gap-3 rounded-lg p-3 ${a.resolved ? "bg-muted/50" : "bg-destructive/5 border border-destructive/10"}`}
                >
                  {a.resolved ? (
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{a.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      {a.resolved && " · Resolvido"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Technical details */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl bg-card p-5 shadow-card"
      >
        <h3 className="text-sm font-semibold mb-4">Dados Técnicos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <Detail label="Capacidade" value={`${plant.capacity_kwp} kWp`} />
          <Detail label="Localização" value={plant.location || "—"} />
          <Detail label="Concessionária" value={plant.utility_company || "—"} />
          <Detail
            label="Data de Instalação"
            value={plant.installation_date ? format(new Date(plant.installation_date), "dd/MM/yyyy") : "—"}
          />
          <Detail label="Latitude" value={plant.latitude?.toString() || "—"} />
          <Detail label="Longitude" value={plant.longitude?.toString() || "—"} />
          <Detail label="Criado em" value={format(new Date(plant.created_at), "dd/MM/yyyy", { locale: ptBR })} />
          <Detail label="Atualizado em" value={format(new Date(plant.updated_at), "dd/MM/yyyy", { locale: ptBR })} />
        </div>
      </motion.div>
    </div>
  );
}

function StatMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-card flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">{icon}</div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold font-mono">{value}</p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold mt-0.5">{value}</p>
    </div>
  );
}
