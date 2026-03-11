import { useState, useCallback } from "react";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { FileUp, Upload, Check, Loader2, AlertCircle, X, FileText, Droplets } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExtractedWaterBillData {
  utility_company?: string;
  account_number?: string;
  client_code?: string;
  property_name?: string;
  address?: string;
  reference_month?: string;
  consumption_m3?: number;
  water_value?: number;
  sewer_value?: number;
  total_value?: number;
  tariff_type?: string;
  due_date?: string;
  invoice_number?: string;
  consumption_history?: Array<{ month: string; consumption_m3: number }>;
}

interface WaterBillImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

type Step = "upload" | "processing" | "review" | "saving" | "done" | "error";

export function WaterBillImportDialog({ open, onOpenChange, onImported }: WaterBillImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedWaterBillData>({});
  const [pdfPath, setPdfPath] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setExtracted({});
    setPdfPath("");
    setTenantId("");
    setErrorMsg("");
  }, []);

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf" && !f.type.startsWith("image/")) {
      toast.error("Envie um arquivo PDF ou imagem da conta de água.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 20MB.");
      return;
    }
    setFile(f);
  };

  const processFile = async () => {
    if (!file) return;
    setStep("processing");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Você precisa estar logado.");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-water-bill`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (response.status === 429) {
        throw new Error("Limite de requisições excedido. Aguarde alguns segundos e tente novamente.");
      }
      if (response.status === 402) {
        throw new Error("Créditos insuficientes. Adicione créditos ao workspace.");
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao processar");

      const extractedData = result.extracted || {};

      // Lookup water property location by client_code
      if (extractedData.client_code) {
        const { data: locData } = await supabase
          .from("property_locations")
          .select("location_name")
          .eq("water_account_number", extractedData.client_code)
          .maybeSingle();

        if (locData?.location_name) {
          extractedData.property_name = locData.location_name;
        }
      }

      setExtracted(extractedData);
      setPdfPath(result.pdf_path);
      setTenantId(result.tenant_id);
      setStep("review");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao processar o arquivo");
      setStep("error");
    }
  };

  const saveData = async () => {
    setStep("saving");
    try {
      // Check for duplicates
      if (extracted.account_number && extracted.reference_month) {
        const { data: existing } = await supabase
          .from("water_bills" as any)
          .select("id")
          .eq("account_number", extracted.account_number)
          .eq("reference_month", extracted.reference_month)
          .maybeSingle();

        if (existing) {
          setErrorMsg(
            `Já existe uma conta de água importada para matrícula ${extracted.account_number} no mês ${extracted.reference_month}.`
          );
          setStep("error");
          return;
        }
      }

      const { error } = await supabase.from("water_bills" as any).insert({
        tenant_id: tenantId,
        property_name: extracted.property_name || null,
        address: extracted.address || null,
        utility_company: extracted.utility_company || null,
        account_number: extracted.account_number || null,
        client_code: extracted.client_code || null,
        reference_month: extracted.reference_month || null,
        consumption_m3: extracted.consumption_m3 || 0,
        water_value: extracted.water_value || 0,
        sewer_value: extracted.sewer_value || 0,
        total_value: extracted.total_value || 0,
        tariff_type: extracted.tariff_type || null,
        due_date: extracted.due_date || null,
        invoice_number: extracted.invoice_number || null,
        consumption_history: extracted.consumption_history || [],
        pdf_path: pdfPath,
        raw_ocr_data: extracted as any,
      } as any);

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            `Conta duplicada: matrícula ${extracted.account_number} / ${extracted.reference_month} já foi importada.`
          );
        }
        throw error;
      }

      setStep("done");
      toast.success("Conta de água importada com sucesso!");
      onImported?.();

      logAuditEvent({
        eventType: "import",
        description: `Conta de água importada: Matrícula ${extracted.account_number || "N/A"} — ${extracted.property_name || "N/A"} — Ref: ${extracted.reference_month || "N/A"}`,
        entityType: "water_bill",
        metadata: {
          account_number: extracted.account_number,
          property_name: extracted.property_name,
          reference_month: extracted.reference_month,
          consumption_m3: extracted.consumption_m3,
          total_value: extracted.total_value,
        },
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao salvar");
      setStep("error");
    }
  };

  const updateField = (key: keyof ExtractedWaterBillData, value: string | number | null) => {
    setExtracted((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-500" />
            Importar Conta de Água
          </DialogTitle>
          <DialogDescription>
            Envie o PDF ou foto da conta de água — os dados serão extraídos automaticamente via OCR.
          </DialogDescription>
        </DialogHeader>

        {/* STEP: UPLOAD */}
        {step === "upload" && (
          <div className="space-y-4 mt-2">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver ? "border-blue-500 bg-blue-500/5" : "border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Arraste o PDF aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF ou imagem • Máx 20MB</p>
                </>
              )}
              <input
                type="file"
                accept=".pdf,image/*"
                className={file ? "hidden" : "absolute inset-0 opacity-0 cursor-pointer"}
                style={file ? {} : { position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!file}
              onClick={processFile}
            >
              <FileUp className="w-4 h-4 mr-2" /> Processar com OCR
            </Button>
          </div>
        )}

        {/* STEP: PROCESSING */}
        {step === "processing" && (
          <div className="flex flex-col items-center py-10 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Extraindo dados da conta de água...</p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
          </div>
        )}

        {/* STEP: REVIEW */}
        {step === "review" && (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Dados extraídos com sucesso! Revise e corrija se necessário antes de salvar.</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Concessionária</Label>
                <Input
                  value={extracted.utility_company || ""}
                  onChange={(e) => updateField("utility_company", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mês Referência</Label>
                <Input
                  value={extracted.reference_month || ""}
                  onChange={(e) => updateField("reference_month", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Matrícula</Label>
                <Input
                  value={extracted.account_number || ""}
                  onChange={(e) => updateField("account_number", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Código do Cliente</Label>
                <Input
                  value={extracted.client_code || ""}
                  onChange={(e) => updateField("client_code", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nº Fatura</Label>
                <Input
                  value={extracted.invoice_number || ""}
                  onChange={(e) => updateField("invoice_number", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Endereço</Label>
              <Input
                value={extracted.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Local (Nomenclatura)</Label>
              <Input
                value={extracted.property_name || ""}
                onChange={(e) => updateField("property_name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Consumo (m³)</Label>
                <Input
                  type="number"
                  value={extracted.consumption_m3 ?? 0}
                  onChange={(e) => updateField("consumption_m3", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={extracted.total_value ?? 0}
                  onChange={(e) => updateField("total_value", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Água (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={extracted.water_value ?? 0}
                  onChange={(e) => updateField("water_value", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Esgoto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={extracted.sewer_value ?? 0}
                  onChange={(e) => updateField("sewer_value", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo Tarifa</Label>
                <Input
                  value={extracted.tariff_type || ""}
                  onChange={(e) => updateField("tariff_type", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vencimento</Label>
                <Input
                  type="date"
                  value={extracted.due_date || ""}
                  onChange={(e) => updateField("due_date", e.target.value)}
                />
              </div>
            </div>

            {/* Consumption History */}
            {extracted.consumption_history && extracted.consumption_history.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Histórico de Consumo</Label>
                <div className="rounded-lg border p-2 space-y-1">
                  {extracted.consumption_history.map((h, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{h.month}</span>
                      <span className="font-mono">{h.consumption_m3} m³</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={reset}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={saveData}>
                <Check className="w-4 h-4 mr-2" /> Confirmar e Salvar
              </Button>
            </div>
          </div>
        )}

        {/* STEP: SAVING */}
        {step === "saving" && (
          <div className="flex flex-col items-center py-10 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Salvando dados...</p>
          </div>
        )}

        {/* STEP: DONE */}
        {step === "done" && (
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Check className="w-7 h-7 text-blue-500" />
            </div>
            <p className="text-sm font-medium">Conta de água importada com sucesso!</p>
            <p className="text-xs text-muted-foreground">Os dados foram salvos no sistema.</p>
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Fechar
            </Button>
          </div>
        )}

        {/* STEP: ERROR */}
        {step === "error" && (
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive">Erro ao processar</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">{errorMsg}</p>
            <Button variant="outline" onClick={reset}>
              Tentar Novamente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
