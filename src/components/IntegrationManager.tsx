import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plug, CheckCircle2, XCircle, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ManufacturerConfig {
  slug: string;
  name: string;
  logo: string;
  authType: "credentials" | "api_key" | "local";
  fields: { key: string; label: string; type: string; placeholder: string }[];
}

const MANUFACTURERS: ManufacturerConfig[] = [
  {
    slug: "growatt",
    name: "Growatt",
    logo: "🟢",
    authType: "credentials",
    fields: [
      { key: "username", label: "Usuário Growatt", type: "text", placeholder: "seu_usuario" },
      { key: "password", label: "Senha", type: "password", placeholder: "••••••••" },
      { key: "base_url", label: "Servidor (opcional)", type: "text", placeholder: "https://openapi.growatt.com" },
    ],
  },
  {
    slug: "solaredge",
    name: "SolarEdge",
    logo: "🔴",
    authType: "api_key",
    fields: [
      { key: "api_key", label: "API Key", type: "text", placeholder: "Cole sua API Key do portal SolarEdge" },
    ],
  },
  {
    slug: "fronius",
    name: "Fronius",
    logo: "🔵",
    authType: "local",
    fields: [
      { key: "base_url", label: "IP/URL do Datalogger", type: "text", placeholder: "http://192.168.1.100" },
    ],
  },
];

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
}

export function IntegrationManager() {
  const [selectedMfr, setSelectedMfr] = useState<ManufacturerConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleTest = async (action: string) => {
    if (!selectedMfr) return;
    setTesting(true);
    setTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Faça login primeiro");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/solar-collector`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            manufacturer: selectedMfr.slug,
            credentials: formData,
            action,
          }),
        }
      );

      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        toast({ title: "Conexão bem-sucedida!", description: `${Array.isArray(result.data) ? result.data.length : 0} item(ns) encontrado(s)` });
      } else {
        toast({ title: "Erro na conexão", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plug className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Integrações de Fabricantes</CardTitle>
            <CardDescription className="text-xs">
              Conecte inversores Growatt, SolarEdge, Fronius e mais
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {MANUFACTURERS.map((mfr) => (
          <div
            key={mfr.slug}
            className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{mfr.logo}</span>
              <div>
                <p className="text-sm font-medium">{mfr.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {mfr.authType === "credentials" ? "Login/Senha" : mfr.authType === "api_key" ? "API Key" : "Rede Local"}
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen && selectedMfr?.slug === mfr.slug} onOpenChange={(open) => {
              setDialogOpen(open);
              if (open) {
                setSelectedMfr(mfr);
                setFormData({});
                setTestResult(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Configurar</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="text-xl">{mfr.logo}</span> {mfr.name}
                  </DialogTitle>
                  <DialogDescription>
                    Configure as credenciais para conectar ao {mfr.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {mfr.fields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={field.key} className="text-xs">{field.label}</Label>
                      <Input
                        id={field.key}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.key] || ""}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      />
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleTest("list_plants")}
                      disabled={testing}
                      className="flex-1 gradient-primary"
                      size="sm"
                    >
                      {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <List className="w-4 h-4 mr-2" />}
                      Testar Conexão
                    </Button>
                  </div>

                  <AnimatePresence>
                    {testResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`rounded-lg p-3 text-sm ${
                          testResult.success
                            ? "bg-energy-green-light text-foreground"
                            : "bg-energy-red-light text-foreground"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {testResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-xs">
                              {testResult.success ? "Conexão bem-sucedida!" : "Falha na conexão"}
                            </p>
                            {testResult.success && Array.isArray(testResult.data) && (
                              <div className="mt-2 space-y-1">
                                {testResult.data.map((item: any, i: number) => (
                                  <p key={i} className="text-xs text-muted-foreground">
                                    • {item.name || item.external_id} {item.capacity_kwp ? `(${item.capacity_kwp} kWp)` : ""}
                                  </p>
                                ))}
                              </div>
                            )}
                            {testResult.error && (
                              <p className="text-xs text-muted-foreground mt-1">{testResult.error}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
