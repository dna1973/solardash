import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

interface GenerationRow {
  ecu_id: string;
  month: number;
  year: number;
  energy_generated_kwh: number;
  plant_id?: string;
  plant_name?: string;
}

interface GenerationImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = "upload" | "processing" | "review" | "saving" | "done" | "error";

const monthNames = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function GenerationImportDialog({ open, onOpenChange, onSuccess }: GenerationImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<GenerationRow[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());

  // Try to extract year from filename
  const extractYearFromFilename = (name: string): number | null => {
    const match = name.match(/(20\d{2})/);
    return match ? parseInt(match[1]) : null;
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setRows([]);
    setErrorMsg("");
    setSavedCount(0);
    setSkippedCount(0);
    setImportYear(new Date().getFullYear());
  };

  const handleFile = (f: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(f.type)) {
      toast({ title: "Formato inválido", description: "Envie um PDF ou imagem (PNG, JPG).", variant: "destructive" });
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 20MB.", variant: "destructive" });
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

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-generation-report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data?.length) {
        throw new Error("Nenhum dado extraído do relatório.");
      }

      // Match ECU IDs to plants
      const { data: plants } = await supabase.from("plants").select("id, name");
      const extractedRows: GenerationRow[] = result.data.map((r: any) => {
        const matchedPlant = (plants || []).find(
          (p) => p.name === r.ecu_id || p.name.includes(r.ecu_id) || r.ecu_id.includes(p.name)
        );
        return {
          ...r,
          plant_id: matchedPlant?.id || undefined,
          plant_name: matchedPlant?.name || r.ecu_id,
        };
      });

      // Determine year: prefer filename, fallback to AI extraction, then current year
      const fileYear = file ? extractYearFromFilename(file.name) : null;
      const detectedYear = fileYear || result.year || new Date().getFullYear();
      setImportYear(detectedYear);

      // Override year from AI with detected year
      const finalRows = extractedRows.map((r: GenerationRow) => ({ ...r, year: detectedYear }));

      setRows(finalRows);
      setStep("review");
    } catch (err: any) {
      console.error("Error processing:", err);
      setErrorMsg(err.message || "Erro ao processar o relatório.");
      setStep("error");
    }
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof GenerationRow, value: any) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const saveData = async () => {
    const validRows = rows.filter((r) => r.plant_id);
    if (validRows.length === 0) {
      toast({ title: "Nenhuma usina mapeada", description: "Associe pelo menos uma linha a uma usina cadastrada.", variant: "destructive" });
      return;
    }

    setStep("saving");
    let saved = 0;
    let skipped = 0;

    try {
      for (const row of validRows) {
        const timestamp = new Date(row.year, row.month - 1, 1).toISOString();

        // Check for duplicates
        const { data: existing } = await supabase
          .from("energy_data")
          .select("id")
          .eq("plant_id", row.plant_id!)
          .gte("timestamp", new Date(row.year, row.month - 1, 1).toISOString())
          .lt("timestamp", new Date(row.year, row.month, 1).toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        const { error } = await supabase.from("energy_data").insert({
          plant_id: row.plant_id!,
          timestamp,
          energy_generated_kwh: row.energy_generated_kwh,
          status: "imported",
        });

        if (error) {
          console.error("Insert error:", error);
          skipped++;
        } else {
          saved++;
        }
      }

      setSavedCount(saved);
      setSkippedCount(skipped);

      if (saved > 0) {
        await logAuditEvent({
          eventType: "generation_import",
          entityType: "energy_data",
          description: `Importação de ${saved} registros de geração via PDF`,
          metadata: { saved, skipped, file_name: file?.name },
        });
      }

      setStep("done");
      onSuccess?.();
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg(err.message || "Erro ao salvar dados.");
      setStep("error");
    }
  };

  // Get available plants for mapping
  const [availablePlants, setAvailablePlants] = useState<Array<{ id: string; name: string }>>([]);
  
  const loadPlants = async () => {
    const { data } = await supabase.from("plants").select("id, name");
    setAvailablePlants(data || []);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Dados de Geração (PDF)</DialogTitle>
          <DialogDescription>
            Importe relatórios de geração mensal das usinas em formato PDF.
          </DialogDescription>
        </DialogHeader>

        {/* Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pdf,image/*";
                input.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) handleFile(f);
                };
                input.click();
              }}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste o relatório ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">PDF ou imagem (máx. 20MB)</p>
            </div>

            {file && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <Button onClick={processFile} size="sm">Processar</Button>
              </div>
            )}
          </div>
        )}

        {/* Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extraindo dados do relatório com IA...</p>
          </div>
        )}

        {/* Review */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">
                {rows.length} registros extraídos. Revise e corrija antes de salvar.
              </p>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Ano de referência:</Label>
                <Input
                  type="number"
                  className="h-8 w-24 text-sm"
                  value={importYear}
                  onChange={(e) => {
                    const y = parseInt(e.target.value) || new Date().getFullYear();
                    setImportYear(y);
                    setRows((prev) => prev.map((r) => ({ ...r, year: y })));
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Linhas sem usina mapeada (em vermelho) serão ignoradas.
            </p>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ECU / Usina</TableHead>
                    <TableHead>Usina Mapeada</TableHead>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Geração (kWh)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={!row.plant_id ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs font-mono">{row.ecu_id}</TableCell>
                      <TableCell>
                        <select
                          className="text-xs border rounded px-2 py-1 bg-background w-full"
                          value={row.plant_id || ""}
                          onChange={(e) => {
                            const plantId = e.target.value || undefined;
                            const plantName = availablePlants.find((p) => p.id === plantId)?.name || row.ecu_id;
                            updateRow(i, "plant_id", plantId);
                            updateRow(i, "plant_name", plantName);
                          }}
                          onFocus={() => { if (availablePlants.length === 0) loadPlants(); }}
                        >
                          <option value="">— Selecionar —</option>
                          {availablePlants.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-xs">
                        {monthNames[row.month]}/{row.year}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 text-xs w-28"
                          value={row.energy_generated_kwh}
                          onChange={(e) => updateRow(i, "energy_generated_kwh", parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                {rows.filter((r) => r.plant_id).length} de {rows.length} mapeadas
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { reset(); }}>Cancelar</Button>
                <Button onClick={saveData} disabled={rows.filter((r) => r.plant_id).length === 0}>
                  Salvar Dados
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Saving */}
        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Salvando registros de geração...</p>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">{savedCount} registros importados com sucesso!</p>
              {skippedCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{skippedCount} duplicados ignorados.</p>
              )}
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm text-destructive text-center">{errorMsg}</p>
            <Button variant="outline" onClick={reset}>Tentar novamente</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
