import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface SyncLog {
  id: string;
  integration_id: string;
  manufacturer: string;
  status: string;
  plants_synced: number;
  energy_points: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: typeof CheckCircle2 }> = {
  success: { label: "Sucesso", variant: "default", icon: CheckCircle2 },
  partial: { label: "Parcial", variant: "secondary", icon: AlertTriangle },
  error: { label: "Erro", variant: "destructive", icon: XCircle },
  pending: { label: "Pendente", variant: "outline", icon: Clock },
};

export function SyncLogsPanel() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setLogs(data as unknown as SyncLog[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const displayedLogs = showAll ? logs : logs.slice(0, 10);

  const errorCount = logs.filter(l => l.status === "error").length;
  const successCount = logs.filter(l => l.status === "success").length;
  const lastSync = logs[0];

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Histórico de Coleta
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {logs.length > 0
              ? `${successCount} sucesso · ${errorCount} erro${errorCount !== 1 ? "s" : ""} nas últimas 50 coletas`
              : "Nenhuma coleta registrada"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="h-7 text-xs gap-1.5">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Last sync summary */}
      {lastSync && (
        <Card className={`border-l-4 ${lastSync.status === "error" ? "border-l-destructive" : lastSync.status === "partial" ? "border-l-yellow-500" : "border-l-primary"}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Última coleta: <span className="capitalize">{lastSync.manufacturer}</span></p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(lastSync.created_at), { addSuffix: true, locale: ptBR })}
                  {" · "}
                  {lastSync.plants_synced} usina(s), {lastSync.energy_points} ponto(s) de energia
                </p>
                {lastSync.error_message && (
                  <p className="text-[11px] text-destructive mt-1 font-mono bg-destructive/5 rounded px-2 py-1">
                    {lastSync.error_message}
                  </p>
                )}
              </div>
              <StatusBadge status={lastSync.status} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log list */}
      <div className="space-y-1.5">
        <AnimatePresence>
          {displayedLogs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-xs hover:bg-muted transition-colors">
                <StatusIcon status={log.status} />
                <span className="capitalize font-medium w-20">{log.manufacturer}</span>
                <span className="text-muted-foreground flex-1">
                  {log.plants_synced} usina(s) · {log.energy_points} ponto(s)
                </span>
                {log.error_message && (
                  <span className="text-destructive truncate max-w-[200px]" title={log.error_message}>
                    {log.error_message.length > 40 ? log.error_message.slice(0, 40) + "…" : log.error_message}
                  </span>
                )}
                <span className="text-muted-foreground shrink-0">
                  {format(new Date(log.created_at), "dd/MM HH:mm")}
                </span>
                <StatusBadge status={log.status} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {logs.length > 10 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs text-muted-foreground gap-1"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll ? "Mostrar menos" : `Mostrar todos (${logs.length})`}
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">{config.label}</Badge>;
}

function StatusIcon({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  const colorClass = status === "error" ? "text-destructive" : status === "partial" ? "text-yellow-500" : status === "success" ? "text-primary" : "text-muted-foreground";
  return <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />;
}
