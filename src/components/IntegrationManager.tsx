import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plug, CheckCircle2, XCircle, List, Save, Trash2, RefreshCw, Zap, Settings2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { SyncLogsPanel } from "@/components/SyncLogsPanel";

interface ManufacturerConfig {
  slug: string;
  name: string;
  logo: string;
  authType: "credentials" | "api_key" | "local";
  fields: { key: string; label: string; type: string; placeholder: string }[];
}

const MANUFACTURERS: ManufacturerConfig[] = [
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
  {
    slug: "growatt",
    name: "Growatt",
    logo: "🟢",
    authType: "api_key",
    fields: [
      { key: "token", label: "Token OpenAPI V1", type: "password", placeholder: "Seu token de 32 caracteres" },
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
  {
    slug: "hoymiles",
    name: "Hoymiles",
    logo: "🟡",
    authType: "credentials",
    fields: [
      { key: "username", label: "Usuário (e-mail)", type: "email", placeholder: "seu-email@exemplo.com" },
      { key: "password", label: "Senha", type: "password", placeholder: "Senha do S-Miles Cloud" },
      { key: "base_url", label: "Servidor (opcional)", type: "text", placeholder: "https://global.hoymiles.com" },
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
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
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

  const connectedCount = savedIntegrations.filter(i => i.is_active).length;

  return (
    <div className="space-y-4">
      {/* Hero header for sync */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Integrações de Fabricantes</h2>
              <p className="text-sm text-muted-foreground">
                {connectedCount > 0
                  ? `${connectedCount} fabricante${connectedCount > 1 ? "s" : ""} conectado${connectedCount > 1 ? "s" : ""}`
                  : "Conecte inversores para coletar dados automaticamente"}
              </p>
            </div>
          </div>
          {savedIntegrations.length > 0 && (
            <Button onClick={handleSyncNow} disabled={syncing} className="gradient-primary gap-2">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar Tudo
            </Button>
          )}
        </div>
      </Card>

      {/* Manufacturer grid - compact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {MANUFACTURERS.map((mfr, i) => {
          const saved = getSavedForMfr(mfr.slug);
          return (
            <motion.div
              key={mfr.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className={`relative overflow-hidden transition-all hover:shadow-card-hover group ${saved?.is_active ? "border-primary/30" : "border-border/50"}`}>
                {saved?.is_active && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                )}
                <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                  <span className="text-2xl">{mfr.logo}</span>
                  <div>
                    <p className="text-sm font-semibold">{mfr.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      {mfr.authType === "credentials" ? "Login/Senha" : mfr.authType === "api_key" ? "API Key" : "Rede Local"}
                    </p>
                  </div>

                  {saved ? (
                    <Badge variant="default" className="text-[10px] px-2 py-0.5">
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                      Desconectado
                    </Badge>
                  )}

                  <div className="flex gap-1.5 w-full mt-1">
                    {saved && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(saved.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Dialog
                      open={dialogOpen && selectedMfr?.slug === mfr.slug}
                      onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (open) {
                          setSelectedMfr(mfr);
                          const s = getSavedForMfr(mfr.slug);
                          setFormData(s?.credentials || {});
                          setTestResult(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant={saved ? "outline" : "default"} size="sm" className={`flex-1 h-7 text-xs ${!saved ? "gradient-primary" : ""}`}>
                          <Settings2 className="w-3 h-3 mr-1" />
                          {saved ? "Editar" : "Configurar"}
                        </Button>
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
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Sync Logs */}
      <SyncLogsPanel />
    </div>
  );
}
