import { alerts } from "@/data/mockData";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { motion } from "framer-motion";

const typeConfig = {
  critical: { icon: XCircle, bg: "bg-energy-red-light", border: "border-l-destructive", iconColor: "text-destructive", label: "Crítico" },
  warning: { icon: AlertTriangle, bg: "bg-energy-yellow-light", border: "border-l-energy-yellow", iconColor: "text-energy-orange", label: "Alerta" },
  info: { icon: Info, bg: "bg-energy-blue-light", border: "border-l-energy-blue", iconColor: "text-energy-blue", label: "Info" },
};

export default function Alerts() {
  const sorted = [...alerts].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
        <p className="text-sm text-muted-foreground">
          {alerts.filter(a => !a.resolved).length} alertas ativos
        </p>
      </div>

      <div className="space-y-3">
        {sorted.map((alert, i) => {
          const config = typeConfig[alert.type];
          const Icon = config.icon;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`rounded-xl p-4 border-l-4 flex items-start gap-4 ${config.bg} ${config.border} ${alert.resolved ? 'opacity-50' : ''}`}
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
                <p className="text-xs text-muted-foreground mt-1">{alert.plant_name} • {new Date(alert.timestamp).toLocaleString('pt-BR')}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
