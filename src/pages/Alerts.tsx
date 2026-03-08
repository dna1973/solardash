import { useAlerts } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, Info, XCircle, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { AnomalyDetector } from "@/components/AnomalyDetector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const alerts = (dbAlerts || []).map((a) => ({
    id: a.id,
    type: a.type as "critical" | "warning" | "info",
    message: a.message,
    plant_name: (a as any).plants?.name || "—",
    resolved: a.resolved,
    timestamp: a.created_at,
  }));

  const sorted = [...alerts].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const activeCount = alerts.filter((a) => !a.resolved).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((a) => a.id)));
    }
  };

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

  const handleBulkResolve = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .in("id", ids);

    if (error) {
      toast({ title: "Erro ao resolver alertas", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${ids.length} alerta(s) resolvido(s)` });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("alerts")
      .delete()
      .in("id", ids);

    if (error) {
      toast({ title: "Erro ao apagar alertas", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${ids.length} alerta(s) apagado(s)` });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    }
    setDeleting(false);
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

  const selectedUnresolved = Array.from(selected).filter((id) => {
    const a = alerts.find((al) => al.id === id);
    return a && !a.resolved;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${activeCount} alertas ativos`}
            
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {sorted.length > 0 && (
                <Checkbox
                  checked={sorted.length > 0 && selected.size === sorted.length}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              )}
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Alertas do Sistema
                {selected.size > 0 && (
                  <span className="ml-2 text-xs font-normal normal-case text-foreground">
                    ({selected.size} selecionado{selected.size > 1 ? "s" : ""})
                  </span>
                )}
              </h2>
            </div>

            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                {selectedUnresolved.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleBulkResolve}>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Resolver ({selectedUnresolved.length})
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting}>
                      {deleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                      Apagar ({selected.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Apagar alertas?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja apagar {selected.size} alerta{selected.size > 1 ? "s" : ""}? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Apagar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

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
                  className={`rounded-xl p-4 border-l-4 flex items-start gap-4 ${config.bg} ${config.border} ${alert.resolved ? "opacity-50" : ""} ${selected.has(alert.id) ? "ring-2 ring-primary/30" : ""}`}
                >
                  {sorted.length > 0 && (
                    <Checkbox
                      checked={selected.has(alert.id)}
                      onCheckedChange={() => toggleSelect(alert.id)}
                      className="mt-0.5"
                      aria-label={`Selecionar alerta: ${alert.message}`}
                    />
                  )}
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
                  {!alert.resolved && (
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
            {sorted.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum alerta encontrado.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
