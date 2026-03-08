import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Brain, Loader2, AlertTriangle, XCircle, Info, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Anomaly {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affected_entity: string;
  recommendation: string;
}

const severityConfig = {
  critical: { icon: XCircle, bg: "bg-energy-red-light", border: "border-l-destructive", iconColor: "text-destructive", label: "Crítico" },
  warning: { icon: AlertTriangle, bg: "bg-energy-yellow-light", border: "border-l-energy-yellow", iconColor: "text-energy-orange", label: "Alerta" },
  info: { icon: Info, bg: "bg-energy-blue-light", border: "border-l-energy-blue", iconColor: "text-energy-blue", label: "Info" },
};

export function AnomalyDetector() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const { toast } = useToast();

  const runDetection = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Erro", description: "Você precisa estar logado.", variant: "destructive" });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-anomalies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (response.status === 429) {
        toast({ title: "Limite de requisições", description: "Tente novamente em alguns minutos.", variant: "destructive" });
        return;
      }
      if (response.status === 402) {
        toast({ title: "Créditos insuficientes", description: "Adicione créditos ao workspace.", variant: "destructive" });
        return;
      }
      if (!response.ok) throw new Error("Falha na análise");

      const data = await response.json();
      setAnomalies(data.anomalies || []);
      setHasRun(true);

      toast({
        title: "Análise concluída",
        description: `${(data.anomalies || []).length} anomalia(s) detectada(s)`,
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Detecção de Anomalias com IA</CardTitle>
              <CardDescription className="text-xs">
                Análise inteligente de inversores, geração e equipamentos
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={runDetection}
            disabled={loading}
            size="sm"
            className="gradient-primary gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? "Analisando..." : "Executar Análise"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!hasRun && !loading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Clique em "Executar Análise" para a IA examinar seus dados e detectar anomalias.
          </p>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <Brain className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm text-muted-foreground">Analisando dados com inteligência artificial...</p>
          </div>
        )}

        <AnimatePresence>
          {hasRun && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {anomalies.length === 0 ? (
                <p className="text-sm text-center py-6 text-primary font-medium">
                  ✅ Nenhuma anomalia detectada. Todos os sistemas operando normalmente.
                </p>
              ) : (
                anomalies.map((anomaly, i) => {
                  const config = severityConfig[anomaly.severity] || severityConfig.info;
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-xl p-4 border-l-4 ${config.bg} ${config.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {config.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground">{anomaly.affected_entity}</span>
                          </div>
                          <p className="text-sm font-semibold">{anomaly.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{anomaly.description}</p>
                          <div className="mt-2 rounded-lg bg-card/60 p-2">
                            <p className="text-xs">
                              <span className="font-medium text-primary">Recomendação:</span>{" "}
                              <span className="text-muted-foreground">{anomaly.recommendation}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
