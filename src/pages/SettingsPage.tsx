import { Settings, Globe, Bell, Database, Shield } from "lucide-react";
import { motion } from "framer-motion";

const integrations = [
  { name: "Huawei FusionSolar", status: "connected", color: "text-primary" },
  { name: "SolarEdge Monitoring", status: "connected", color: "text-primary" },
  { name: "Growatt Server", status: "pending", color: "text-energy-yellow" },
  { name: "Fronius Solar API", status: "disconnected", color: "text-muted-foreground" },
  { name: "GoodWe SEMS Portal", status: "disconnected", color: "text-muted-foreground" },
  { name: "SMA Sunny Portal", status: "disconnected", color: "text-muted-foreground" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerenciar plataforma e integrações</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integrations */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Integrações de Fabricantes</h3>
          </div>
          <div className="space-y-3">
            {integrations.map((integ) => (
              <div key={integ.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium">{integ.name}</span>
                <span className={`text-xs font-medium ${integ.color}`}>
                  {integ.status === 'connected' ? '● Conectado' : integ.status === 'pending' ? '◐ Pendente' : '○ Desconectado'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Settings sections */}
        <div className="space-y-4">
          {[
            { icon: Bell, title: "Notificações", desc: "Configurar alertas por e-mail e painel" },
            { icon: Database, title: "Coleta de Dados", desc: "Intervalos de polling: 1min, 5min, 15min" },
            { icon: Shield, title: "Segurança", desc: "Autenticação, tokens e logs de auditoria" },
            { icon: Settings, title: "Geral", desc: "Informações da empresa e preferências" },
          ].map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-card p-4 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer flex items-center gap-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <section.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">{section.title}</h4>
                <p className="text-xs text-muted-foreground">{section.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
