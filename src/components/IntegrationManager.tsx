import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plug, CheckCircle2, XCircle, List, Save, Trash2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

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
      { key: "base_url", label: "Servidor", type: "text", placeholder: "server.growatt.com" },
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
  {
    slug: "apsystems",
    name: "APsystems",
    logo: "🟠",
    authType: "api_key",
    fields: [
      { key: "api_key", label: "App ID (OpenAPI)", type: "text", placeholder: "Seu App ID do portal EMA" },
      { key: "token", label: "App Secret", type: "password", placeholder: "Seu App Secret" },
      { key: "system_id", label: "System ID (sid)", type: "text", placeholder: "Ex: AZ12649A3DFF" },
      { key: "base_url", label: "Servidor (opcional)", type: "text", placeholder: "https://api.apsystemsema.com:9282" },
    ],
  },
];

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface SavedIntegration {
  id: string;
  manufacturer: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  credentials: Record<string, string>;
}

export function IntegrationManager() {
  const [selectedMfr, setSelectedMfr] = useState<ManufacturerConfig | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savedIntegrations, setSavedIntegrations] = useState<SavedIntegration[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSavedIntegrations();
  }, []);

  const fetchSavedIntegrations = async () => {
    const { data } = await supabase
      .from("integrations")
      .select("id, manufacturer, is_active, last_sync_at, last_error, credentials");
    if (data) setSavedIntegrations(data as SavedIntegration[]);
  };

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

  const handleSyncNow = async () => {
    setSyncing(true);
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
          body: JSON.stringify({ action: "sync_all" }),
        }
      );
      const result = await response.json();
      if (result.success) {
        toast({ title: "Sincronização concluída!", description: `${result.totalPlants || 0} planta(s) sincronizada(s), ${result.totalEnergy || 0} ponto(s) de energia.` });
      } else {
        toast({ title: "Erro na sincronização", description: result.error, variant: "destructive" });
      }
      await fetchSavedIntegrations();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedMfr) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      const existing = savedIntegrations.find((i) => i.manufacturer === selectedMfr.slug);

      if (existing) {
        await supabase
          .from("integrations")
          .update({ credentials: formData, is_active: true, last_error: null })
          .eq("id", existing.id);
      } else {
        await supabase.from("integrations").insert({
          tenant_id: profile.tenant_id,
          manufacturer: selectedMfr.slug,
          credentials: formData,
          is_active: true,
        });
      }

      toast({ title: "Salvo!", description: `Credenciais ${selectedMfr.name} salvas. Iniciando sincronização...` });
      await fetchSavedIntegrations();
      setDialogOpen(false);

      // Auto-sync after saving
      handleSyncNow();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    await supabase.from("integrations").delete().eq("id", id);
    toast({ title: "Integração removida" });
    await fetchSavedIntegrations();
  };

  const getSavedForMfr = (slug: string) => savedIntegrations.find((i) => i.manufacturer === slug);

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plug className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Integrações de Fabricantes</CardTitle>
              <CardDescription className="text-xs">
                Conecte inversores Growatt, SolarEdge, Fronius, APsystems e mais
              </CardDescription>
            </div>
          </div>
          {savedIntegrations.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncing}>
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sincronizar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {MANUFACTURERS.map((mfr) => {
          const saved = getSavedForMfr(mfr.slug);
          return (
            <div
              key={mfr.slug}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{mfr.logo}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{mfr.name}</p>
                    {saved && (
                      <Badge variant={saved.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {saved.is_active ? "Conectado" : "Inativo"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {mfr.authType === "credentials" ? "Login/Senha" : mfr.authType === "api_key" ? "API Key" : "Rede Local"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {saved && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(saved.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Dialog
                  open={dialogOpen && selectedMfr?.slug === mfr.slug}
                  onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (open) {
                      setSelectedMfr(mfr);
                      // Pre-fill with saved credentials
                      const s = getSavedForMfr(mfr.slug);
                      setFormData(s?.credentials || {});
                      setTestResult(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">{saved ? "Editar" : "Configurar"}</Button>
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
                          disabled={testing || saving}
                          variant="outline"
                          className="flex-1"
                          size="sm"
                        >
                          {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <List className="w-4 h-4 mr-2" />}
                          Testar Conexão
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={testing || saving}
                          className="flex-1 gradient-primary"
                          size="sm"
                        >
                          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Salvar
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
                                    {testResult.data.length === 0 && (
                                      <p className="text-xs text-muted-foreground">Nenhuma planta encontrada nesta conta.</p>
                                    )}
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
