import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import * as XLSX from "xlsx-js-style";

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

const EXCEL_TYPES = [
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function isExcelFile(file: File): boolean {
  return EXCEL_TYPES.includes(file.type) ||
    file.name.endsWith(".xls") ||
    file.name.endsWith(".xlsx");
}

function extractYearFromFilename(name: string): number | null {
  const match = name.match(/(20\d{2})/);
  return match ? parseInt(match[1]) : null;
}

/** Extract plant name from Growatt filename like "9018.1_-_PRF_PE_CARUARU_Ledax_-_2026.xls" */
function extractPlantNameFromFilename(name: string): string {
  // Remove extension
  let clean = name.replace(/\.(xls|xlsx)$/i, "");
  // Replace underscores with spaces
  clean = clean.replace(/_/g, " ");
  // Remove year
  clean = clean.replace(/\s*-?\s*20\d{2}\s*$/, "");
  // Remove trailing " - Ledax" or similar suffixes
  clean = clean.replace(/\s*-\s*Ledax\s*$/i, "");
  // Remove leading code like "9018.1 - "
  clean = clean.replace(/^\d+(\.\d+)?\s*-\s*/, "");
  return clean.trim();
}

/** Parse a Growatt .xls/.xlsx file and return GenerationRow[] */
function parseGrowattExcel(file: File): Promise<GenerationRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        // Row 0: plant name (e.g. "9018.1 - PRF PE CARUARU Year Report")
        const titleRow = String(json[0]?.[0] || "");
        const plantLabel = titleRow.replace(/\s*Year\s*Report\s*/i, "").trim();

        // Row 3 (index 3): year
        const yearStr = String(json[3]?.[0] || "");
        const year = parseInt(yearStr) || extractYearFromFilename(file.name) || new Date().getFullYear();

        // Find "Inverter Data" section
        let inverterStartIdx = -1;
        for (let i = 0; i < json.length; i++) {
          const firstCell = String(json[i]?.[0] || "").toLowerCase();
          if (firstCell.includes("inverter data")) {
            inverterStartIdx = i;
            break;
          }
        }

        if (inverterStartIdx === -1) {
          reject(new Error(`Seção "Inverter Data" não encontrada em ${file.name}`));
          return;
        }

        // Find header row with "Inverter Serial Number" after inverterStartIdx
        let headerIdx = -1;
        for (let i = inverterStartIdx; i < json.length; i++) {
          const cell = String(json[i]?.[0] || "").toLowerCase();
          if (cell.includes("inverter serial number") || cell.includes("serial number")) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx === -1) {
          reject(new Error(`Cabeçalho "Inverter Serial Number" não encontrado em ${file.name}`));
          return;
        }

        // Find month column indices from the header row
        // The header has months 1-12 (columns vary, let's find them)
        const headerRow = json[headerIdx];
        const monthColMap: Record<number, number> = {}; // month -> colIndex
        for (let c = 0; c < headerRow.length; c++) {
          const val = parseInt(String(headerRow[c]));
          if (val >= 1 && val <= 12 && !monthColMap[val]) {
            monthColMap[val] = c;
          }
        }

        // Read inverter rows after header until empty or next section
        const rows: GenerationRow[] = [];
        const monthTotals: Record<number, number> = {};

        for (let i = headerIdx + 1; i < json.length; i++) {
          const row = json[i];
          const serial = String(row[0] || "").trim();
          
          // Stop at empty row or next section header
          if (!serial || serial.toLowerCase().includes("storage data") || serial.toLowerCase().includes("hybrid")) {
            break;
          }

          // Sum this inverter's monthly values into totals
          for (let m = 1; m <= 12; m++) {
            const colIdx = monthColMap[m];
            if (colIdx === undefined) continue;
            const val = parseFloat(String(row[colIdx])) || 0;
            if (val > 0) {
              monthTotals[m] = (monthTotals[m] || 0) + val;
            }
          }
        }

        // Create one row per month with totals
        for (let m = 1; m <= 12; m++) {
          if (monthTotals[m] && monthTotals[m] > 0) {
            rows.push({
              ecu_id: plantLabel,
              month: m,
              year,
              energy_generated_kwh: Math.round(monthTotals[m] * 100) / 100,
            });
          }
        }

        resolve(rows);
      } catch (err: any) {
        reject(new Error(`Erro ao ler ${file.name}: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

/** Try to match a plant label to existing plants */
function matchPlant(
  label: string,
  plants: Array<{ id: string; name: string }>
): { id: string; name: string } | undefined {
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  const normLabel = normalise(label);

  // Direct includes match
  for (const p of plants) {
    const normName = normalise(p.name);
    if (normName.includes(normLabel) || normLabel.includes(normName)) return p;
  }

  // Token overlap
  const tokens = normLabel.split(" ").filter((t) => t.length > 2);
  let bestMatch: typeof plants[0] | undefined;
  let bestScore = 0;
  for (const p of plants) {
    const pTokens = normalise(p.name).split(" ").filter((t) => t.length > 2);
    const overlap = tokens.filter((t) => pTokens.some((pt) => pt.includes(t) || t.includes(pt))).length;
    const score = overlap / Math.max(tokens.length, 1);
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = p;
    }
  }
  return bestMatch;
}

export function GenerationImportDialog({ open, onOpenChange, onSuccess }: GenerationImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<GenerationRow[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());
  const [availablePlants, setAvailablePlants] = useState<Array<{ id: string; name: string }>>([]);

  const reset = () => {
    setStep("upload");
    setFiles([]);
    setRows([]);
    setErrorMsg("");
    setSavedCount(0);
    setSkippedCount(0);
    setImportYear(new Date().getFullYear());
  };

  const validFileTypes = [
    "application/pdf", "image/png", "image/jpeg", "image/webp",
    ...EXCEL_TYPES,
  ];

  const handleFiles = (incoming: FileList | File[]) => {
    const accepted: File[] = [];
    for (const f of Array.from(incoming)) {
      const isValid = validFileTypes.includes(f.type) || isExcelFile(f);
      if (!isValid) {
        toast({ title: "Formato inválido", description: `${f.name}: envie PDF, imagem ou Excel.`, variant: "destructive" });
        continue;
      }
      if (f.size > 20 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${f.name}: máximo 20MB.`, variant: "destructive" });
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const loadPlants = async () => {
    const { data } = await supabase.from("plants").select("id, name");
    setAvailablePlants(data || []);
    return data || [];
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setStep("processing");

    try {
      const plants = availablePlants.length > 0 ? availablePlants : await loadPlants();
      const allRows: GenerationRow[] = [];
      let detectedYear = new Date().getFullYear();

      const excelFiles = files.filter(isExcelFile);
      const pdfFiles = files.filter((f) => !isExcelFile(f));

      // Process Excel files locally
      for (const ef of excelFiles) {
        const parsed = await parseGrowattExcel(ef);
        if (parsed.length > 0) {
          detectedYear = parsed[0].year;
        }

        // Auto-match plants
        for (const row of parsed) {
          const matched = matchPlant(row.ecu_id, plants);
          // Also try filename-based matching
          const fileLabel = extractPlantNameFromFilename(ef.name);
          const matchedByFile = !matched ? matchPlant(fileLabel, plants) : undefined;
          const finalMatch = matched || matchedByFile;

          allRows.push({
            ...row,
            plant_id: finalMatch?.id,
            plant_name: finalMatch?.name || row.ecu_id,
          });
        }
      }

      // Process PDF/image files via OCR
      for (const pf of pdfFiles) {
        const formData = new FormData();
        formData.append("file", pf);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-generation-report`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro ${response.status} ao processar ${pf.name}`);
        }

        const result = await response.json();
        if (result.success && result.data?.length) {
          const fileYear = extractYearFromFilename(pf.name) || result.year || detectedYear;
          for (const r of result.data) {
            const matched = matchPlant(r.ecu_id, plants);
            allRows.push({
              ...r,
              year: fileYear,
              plant_id: matched?.id,
              plant_name: matched?.name || r.ecu_id,
            });
          }
          detectedYear = fileYear;
        }
      }

      if (allRows.length === 0) {
        throw new Error("Nenhum dado extraído dos arquivos.");
      }

      setImportYear(detectedYear);
      setRows(allRows);
      setStep("review");
    } catch (err: any) {
      console.error("Error processing:", err);
      setErrorMsg(err.message || "Erro ao processar os arquivos.");
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
        const fileNames = files.map((f) => f.name).join(", ");
        await logAuditEvent({
          eventType: "generation_import",
          entityType: "energy_data",
          description: `Importação de ${saved} registros de geração via ${files.some(isExcelFile) ? "Excel" : "PDF"}`,
          metadata: { saved, skipped, file_names: fileNames },
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Dados de Geração</DialogTitle>
          <DialogDescription>
            Importe relatórios de geração mensal via PDF ou planilhas Excel (Growatt).
          </DialogDescription>
        </DialogHeader>

        {/* Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pdf,.xls,.xlsx,image/*";
                input.multiple = true;
                input.onchange = (e) => {
                  const fl = (e.target as HTMLInputElement).files;
                  if (fl) handleFiles(fl);
                };
                input.click();
              }}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste os arquivos ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, imagem ou Excel (.xls/.xlsx) — múltiplos arquivos permitidos</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(i)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button onClick={processFiles} size="sm">
                    Processar {files.length} arquivo{files.length > 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processando arquivos...</p>
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
                    <TableHead>Identificação</TableHead>
                    <TableHead>Usina Mapeada</TableHead>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Geração (kWh)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={!row.plant_id ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs font-mono max-w-[200px] truncate" title={row.ecu_id}>
                        {row.ecu_id}
                      </TableCell>
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
                <Button variant="outline" onClick={reset}>Cancelar</Button>
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
