import { Settings, Bell, Database, Shield, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { IntegrationManager } from "@/components/IntegrationManager";

export default function SettingsPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerenciar plataforma e integrações</p>
        </div>
      )}

      {/* Integration Manager - full width hero */}
      <IntegrationManager />

      {/* Settings sections - horizontal row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { icon: Bell, title: "Notificações", desc: "Alertas por e-mail e painel" },
          { icon: Database, title: "Coleta de Dados", desc: "Polling: 1min, 5min, 15min" },
          { icon: Shield, title: "Segurança", desc: "Tokens e logs de auditoria" },
          { icon: Settings, title: "Geral", desc: "Empresa e preferências" },
        ].map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group rounded-xl bg-card border border-border/50 p-4 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
              <section.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold">{section.title}</h4>
              <p className="text-[11px] text-muted-foreground truncate">{section.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
