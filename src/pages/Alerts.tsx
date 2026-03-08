import { useAlerts } from "@/hooks/useSupabaseData";
import { alerts as mockAlerts } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, Info, XCircle, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { AnomalyDetector } from "@/components/AnomalyDetector";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const typeConfig: Record<string, { icon: any; bg: string; border: string; iconColor: string; label: string }> = {
  critical: { icon: XCircle, bg: "bg-energy-red-light", border: "border-l-destructive", iconColor: "text-destructive", label: "Crítico" },
  warning: { icon: AlertTriangle, bg: "bg-energy-yellow-light", border: "border-l-energy-yellow", iconColor: "text-energy-orange", label: "Alerta" },
  info: { icon: Info, bg: "bg-energy-blue-light", border: "border-l-energy-blue", iconColor: "text-energy-blue", label: "Info" },
};

export default function Alerts() {
  const { data: dbAlerts, isLoading } = useAlerts();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);

  const hasReal = dbAlerts && dbAlerts.length > 0;

  const alerts = hasReal
    ? dbAlerts.map((a) => ({
        id: a.id,
        type: a.type as "critical" | "warning" | "info",
        message: a.message,
        plant_name: (a as any).plants?.name || "—",
        resolved: a.resolved,
        timestamp: a.created_at,
      }))
    : mockAlerts;

  const sorted = [...alerts].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const activeCount = alerts.filter((a) => !a.resolved).length;

  const handleResolve = async (alertId: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);

    if (error) {
      toast({ title: "Erro ao resolver alerta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Alerta resolvido" });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Faça login primeiro");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-generation-alerts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({}),
        }
      );
      const result = await response.json();
      if (result.success) {
        toast({ title: "Verificação concluída", description: `${result.alerts_created || 0} novo(s) alerta(s), ${result.plants_checked || 0} usina(s) verificada(s).` });
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
      } else {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${activeCount} alertas ativos`}
            {!hasReal && !isLoading && <span className="text-[10px] ml-2 text-muted-foreground/60">(dados de demonstração)</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCheckNow} disabled={checking}>
          {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Verificar Agora
        </Button>
      </div>

      <AnomalyDetector />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Alertas do Sistema
          </h2>
          <div className="space-y-3">
            {sorted.map((alert, i) => {
              const config = typeConfig[alert.type] || typeConfig.info;
              const Icon = config.icon;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-xl p-4 border-l-4 flex items-start gap-4 ${config.bg} ${config.border} ${alert.resolved ? "opacity-50" : ""}`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{config.label}</span>
                      {alert.resolved && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Resolvido
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.plant_name} • {new Date(alert.timestamp).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {!alert.resolved && hasReal && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs text-primary hover:text-primary"
                      onClick={() => handleResolve(alert.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Resolver
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
