import { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Alert {
  id: string;
  type: string;
  message: string;
  created_at: string;
  plant_id: string;
  resolved: boolean;
}

export function NotificationBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchAlerts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("alerts")
      .select("id, type, message, created_at, plant_id, resolved")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(10);
    setAlerts((data as Alert[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
    // Realtime subscription for new alerts
    const channel = supabase
      .channel("alerts-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => fetchAlerts()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const count = alerts.length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const typeIcon = (type: string) => {
    if (type === "low_generation" || type === "offline") {
      return <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />;
    }
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchAlerts(); }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-lg z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="text-sm font-semibold">Notificações</h4>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-xs text-muted-foreground">Carregando...</div>
              ) : count === 0 ? (
                <div className="p-6 flex flex-col items-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs">Nenhum alerta pendente</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => { setOpen(false); navigate("/alerts"); }}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 flex items-start gap-3"
                  >
                    {typeIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {alert.type === "low_generation" ? "Geração baixa" :
                          alert.type === "offline" ? "Offline" : alert.type}
                        {" · "}
                        {timeAgo(alert.created_at)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {count > 0 && (
              <div className="border-t px-4 py-2.5">
                <button
                  onClick={() => { setOpen(false); navigate("/alerts"); }}
                  className="text-xs text-primary font-medium hover:underline w-full text-center"
                >
                  Ver todos os alertas
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
