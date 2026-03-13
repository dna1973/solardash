import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlants, useAlerts, useEnergyData } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { autoFitColumns } from "@/lib/excelUtils";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, Download, Sparkles, DollarSign, AlertTriangle, CheckCircle2,
  Shield, Users, ClipboardList, Zap, BarChart3, FileText
} from "lucide-react";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const AVG_SUN_HOURS = 4.5;
const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const DEFAULT_CHECKLIST = [
  { id: "manut_preventiva", label: "Manutenção preventiva das usinas realizada", done: false },
  { id: "manut_corretiva", label: "Pendências de manutenção corretiva sanadas", done: false },
  { id: "regularizacao_tarifaria", label: "Regularização tarifária junto à Neoenergia concluída", done: false },
  { id: "cobrancas_indevidas", label: "Verificação de cobranças indevidas (Art. 2º, III)", done: false },
  { id: "rateio_creditos", label: "Rateio de créditos junto à Neoenergia formalizado (Art. 2º, II)", done: false },
  { id: "documentacao_scee", label: "Documentação do SCEE atualizada", done: false },
  { id: "monitoramento_furto", label: "Sistema de monitoramento antifurto operacional", done: false },
  { id: "limpeza_paineis", label: "Limpeza dos painéis solares realizada", done: false },
];

interface CommissionMember {
  role: string;
  name: string;
}

const DEFAULT_COMMISSION: CommissionMember[] = [
  { role: "Presidente", name: "" },
  { role: "Vice-Presidente", name: "" },
  { role: "Membro DEL01", name: "" },
  { role: "Membro DEL02", name: "" },
  { role: "Membro DEL03", name: "" },
  { role: "Membro DEL04", name: "" },
  { role: "Membro DEL05", name: "" },
  { role: "Membro DEL06", name: "" },
];

function getSemesterMonths(semester: number): number[] {
  return semester === 1 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
}

export function SemesterReport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: plantsData = [], isLoading: loadingPlants } = usePlants();
  const { data: alertsRaw = [], isLoading: loadingAlerts } = useAlerts();
  const { data: energyData = [], isLoading: loadingEnergy } = useEnergyData(undefined, "year");

  const currentYear = new Date().getFullYear();
  const currentSemester = new Date().getMonth() < 6 ? 1 : 2;

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedSemester, setSelectedSemester] = useState(String(currentSemester));
  const [tariff, setTariff] = useState("0.75");
  const [showChecklist, setShowChecklist] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ resumoExecutivo: string; conclusaoRecomendacoes: string } | null>(null);

  // Load/save checklist from localStorage
  const [checklist, setChecklist] = useState(() => {
    try {
      const saved = localStorage.getItem("semester_report_checklist");
      return saved ? JSON.parse(saved) : DEFAULT_CHECKLIST;
    } catch { return DEFAULT_CHECKLIST; }
  });

  const [commission, setCommission] = useState<CommissionMember[]>(() => {
    try {
      const saved = localStorage.getItem("semester_report_commission");
      return saved ? JSON.parse(saved) : DEFAULT_COMMISSION;
    } catch { return DEFAULT_COMMISSION; }
  });

  useEffect(() => {
    localStorage.setItem("semester_report_checklist", JSON.stringify(checklist));
  }, [checklist]);

  useEffect(() => {
    localStorage.setItem("semester_report_commission", JSON.stringify(commission));
  }, [commission]);

  // Energy bills & property locations
  const [energyBills, setEnergyBills] = useState<any[]>([]);
  const [propertyLocations, setPropertyLocations] = useState<any[]>([]);
  const [locationPlants, setLocationPlants] = useState<any[]>([]);

  useEffect(() => {
    async function fetchExtra() {
      const [billsRes, locsRes, lpRes] = await Promise.all([
        supabase.from("energy_bills").select("*"),
        supabase.from("property_locations").select("*"),
        supabase.from("property_location_plants").select("*"),
      ]);
      setEnergyBills(billsRes.data || []);
      setPropertyLocations(locsRes.data || []);
      setLocationPlants(lpRes.data || []);
    }
    fetchExtra();
  }, []);

  const year = parseInt(selectedYear);
  const semester = parseInt(selectedSemester);
  const semesterMonths = getSemesterMonths(semester);
  const semesterLabel = `${semester}º Semestre de ${year}`;
  const tariffValue = parseFloat(tariff) || 0.75;

  // Filter energy data for selected semester
  const semesterEnergyData = useMemo(() => {
    return energyData.filter((d) => {
      const date = new Date(d.timestamp);
      return date.getFullYear() === year && semesterMonths.includes(date.getMonth());
    });
  }, [energyData, year, semesterMonths]);

  // Generation by plant/month
  const generationByPlantMonth = useMemo(() => {
    const map = new Map<string, Map<number, { generated: number; consumed: number }>>();
    const plantNames = new Map<string, string>();
    (plantsData as any[]).forEach((p) => plantNames.set(p.id, p.name));

    semesterEnergyData.forEach((d) => {
      const month = new Date(d.timestamp).getMonth();
      const plantId = d.plant_id;
      if (!map.has(plantId)) map.set(plantId, new Map());
      const mMap = map.get(plantId)!;
      const entry = mMap.get(month) || { generated: 0, consumed: 0 };
      entry.generated += d.energy_generated_kwh || 0;
      entry.consumed += d.energy_consumed_kwh || 0;
      mMap.set(month, entry);
    });

    const rows: Array<{
      plantId: string; plantName: string; month: number; monthLabel: string;
      generated: number; consumed: number; expectedKwh: number; performance: number;
    }> = [];

    map.forEach((monthMap, plantId) => {
      const plant = (plantsData as any[]).find((p) => p.id === plantId);
      const capacityKwp = plant?.capacity_kwp || 0;

      monthMap.forEach((val, month) => {
        const expectedKwh = capacityKwp * AVG_SUN_HOURS * DAYS_PER_MONTH[month];
        rows.push({
          plantId,
          plantName: plantNames.get(plantId) || "—",
          month,
          monthLabel: MONTH_NAMES[month],
          generated: val.generated,
          consumed: val.consumed,
          expectedKwh,
          performance: expectedKwh > 0 ? (val.generated / expectedKwh) * 100 : 0,
        });
      });
    });

    return rows.sort((a, b) => a.plantName.localeCompare(b.plantName) || a.month - b.month);
  }, [semesterEnergyData, plantsData]);

  // Saving totals
  const totalGenerated = useMemo(() => generationByPlantMonth.reduce((s, r) => s + r.generated, 0), [generationByPlantMonth]);
  const totalExpected = useMemo(() => generationByPlantMonth.reduce((s, r) => s + r.expectedKwh, 0), [generationByPlantMonth]);
  const totalSaving = totalGenerated * tariffValue;

  // Saving by plant
  const savingByPlant = useMemo(() => {
    const map = new Map<string, { name: string; generated: number; saving: number }>();
    generationByPlantMonth.forEach((r) => {
      const entry = map.get(r.plantId) || { name: r.plantName, generated: 0, saving: 0 };
      entry.generated += r.generated;
      entry.saving += r.generated * tariffValue;
      map.set(r.plantId, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.saving - a.saving);
  }, [generationByPlantMonth, tariffValue]);

  // Rateio de créditos por UC
  const rateiData = useMemo(() => {
    const semesterBills = energyBills.filter((b) => {
      if (!b.reference_month) return false;
      const [m, y] = b.reference_month.split("/");
      const billMonth = parseInt(m) - 1;
      const billYear = parseInt(y);
      return billYear === year && semesterMonths.includes(billMonth);
    });

    const locMap = new Map<string, string>();
    propertyLocations.forEach((loc: any) => {
      locMap.set(loc.account_number, loc.location_name);
    });

    const ucMap = new Map<string, { locationName: string; totalConsumption: number; totalGeneration: number; totalValue: number; bills: number }>();
    semesterBills.forEach((b) => {
      const key = b.account_number || b.property_name || "Sem UC";
      const entry = ucMap.get(key) || {
        locationName: locMap.get(b.account_number) || b.property_name || key,
        totalConsumption: 0,
        totalGeneration: 0,
        totalValue: 0,
        bills: 0,
      };
      entry.totalConsumption += b.consumption_kwh || 0;
      entry.totalGeneration += b.generation_kwh || 0;
      entry.totalValue += b.amount_brl || b.net_value || 0;
      entry.bills += 1;
      ucMap.set(key, entry);
    });

    return Array.from(ucMap.entries()).map(([uc, data]) => ({
      uc,
      ...data,
      creditBalance: data.totalGeneration - data.totalConsumption,
    })).sort((a, b) => a.locationName.localeCompare(b.locationName));
  }, [energyBills, propertyLocations, year, semesterMonths]);

  // Alerts in semester
  const semesterAlerts = useMemo(() => {
    return (alertsRaw as any[]).filter((a) => {
      const date = new Date(a.created_at);
      return date.getFullYear() === year && semesterMonths.includes(date.getMonth());
    });
  }, [alertsRaw, year, semesterMonths]);

  const alertsByType = useMemo(() => {
    const map = new Map<string, number>();
    semesterAlerts.forEach((a) => {
      map.set(a.type, (map.get(a.type) || 0) + 1);
    });
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }, [semesterAlerts]);

  // Year options
  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    energyData.forEach((d) => years.add(new Date(d.timestamp).getFullYear()));
    energyBills.forEach((b) => {
      if (b.reference_month) {
        const [, y] = b.reference_month.split("/");
        years.add(parseInt(y));
      }
    });
    if (years.size === 0) years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [energyData, energyBills, currentYear]);

  // Generate AI analysis
  const handleGenerateAI = useCallback(async () => {
    setGenerating(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-semester-report", {
        body: {
          semesterLabel,
          totalSaving,
          generationData: generationByPlantMonth.map((r) => ({
            usina: r.plantName, mes: r.monthLabel,
            gerado_kwh: Math.round(r.generated), previsto_kwh: Math.round(r.expectedKwh),
            desempenho_pct: Math.round(r.performance),
          })),
          savingData: savingByPlant.map((s) => ({
            usina: s.name, geracao_kwh: Math.round(s.generated),
            economia_rs: s.saving.toFixed(2),
          })),
          rateiData: rateiData.map((r) => ({
            unidade: r.locationName, consumo_kwh: Math.round(r.totalConsumption),
            geracao_kwh: Math.round(r.totalGeneration), saldo_creditos: Math.round(r.creditBalance),
            valor_total: r.totalValue.toFixed(2),
          })),
          alertsData: semesterAlerts.map((a: any) => ({
            tipo: a.type, mensagem: a.message,
            data: new Date(a.created_at).toLocaleDateString("pt-BR"),
            resolvido: a.resolved,
          })),
          checklistItems: showChecklist ? checklist.filter((c: any) => !c.done).map((c: any) => c.label) : null,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setAiResult({
        resumoExecutivo: data.resumoExecutivo || "",
        conclusaoRecomendacoes: data.conclusaoRecomendacoes || "",
      });
      toast({ title: "Análise gerada com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao gerar análise", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [semesterLabel, totalSaving, generationByPlantMonth, savingByPlant, rateiData, semesterAlerts, showChecklist, checklist, toast]);

  // Export PDF
  const handleExportPDF = useCallback(async () => {
    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF({ orientation: "portrait" });
      const pageW = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(14);
      doc.setTextColor(34, 34, 34);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO SEMESTRAL DE EFICIÊNCIA ENERGÉTICA", pageW / 2, y, { align: "center" });
      y += 7;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text("Conforme Art. 4º da Portaria nº 11/2026 — CGE-PE", pageW / 2, y, { align: "center" });
      y += 5;
      doc.text(semesterLabel, pageW / 2, y, { align: "center" });
      y += 4;

      // Commission members in header
      const activeMembers = commission.filter((m) => m.name.trim());
      if (activeMembers.length > 0) {
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        const memberLine = activeMembers.map((m) => `${m.role}: ${m.name}`).join(" | ");
        doc.text(memberLine, pageW / 2, y, { align: "center", maxWidth: pageW - 28 });
        y += 5;
      }

      // Saving highlight
      y += 4;
      doc.setFillColor(34, 139, 34);
      doc.roundedRect(14, y - 5, pageW - 28, 16, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`ECONOMIA TOTAL NO SEMESTRE: R$ ${totalSaving.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, pageW / 2, y + 3, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Tarifa: R$ ${tariffValue.toFixed(2)}/kWh | Geração: ${(totalGenerated / 1000).toFixed(1)} MWh`, pageW / 2, y + 9, { align: "center" });
      y += 20;

      const addCheckPage = () => {
        if (y > 260) { doc.addPage(); y = 20; }
      };

      // Section helper
      const addSection = (title: string) => {
        addCheckPage();
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(34, 34, 34);
        doc.text(title, 14, y);
        y += 2;
        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(14, y, pageW - 14, y);
        y += 6;
      };

      // 1. Resumo Executivo
      if (aiResult?.resumoExecutivo) {
        addSection("1. Resumo Executivo");
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(aiResult.resumoExecutivo, pageW - 28);
        for (const line of lines) {
          addCheckPage();
          doc.text(line, 14, y, { align: "justify", maxWidth: pageW - 28 });
          y += 4;
        }
        y += 4;
      }

      // 2. Geração Prevista vs Realizada
      addSection("2. Geração Prevista vs. Realizada");
      doc.setFontSize(7);
      const genHeaders = ["Usina", "Mês", "Previsto (kWh)", "Realizado (kWh)", "Desempenho (%)"];
      doc.setFillColor(59, 130, 246);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, y - 4, pageW - 28, 6, "F");
      const colW = (pageW - 28) / 5;
      genHeaders.forEach((h, i) => doc.text(h, 16 + i * colW, y, { align: "left" }));
      y += 5;
      doc.setTextColor(34, 34, 34);
      generationByPlantMonth.forEach((r, idx) => {
        addCheckPage();
        if (idx % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(14, y - 3.5, pageW - 28, 5, "F"); }
        doc.text(r.plantName.slice(0, 20), 16, y);
        doc.text(r.monthLabel, 16 + colW, y);
        doc.text(Math.round(r.expectedKwh).toLocaleString("pt-BR"), 16 + colW * 2, y);
        doc.text(Math.round(r.generated).toLocaleString("pt-BR"), 16 + colW * 3, y);
        doc.text(`${Math.round(r.performance)}%`, 16 + colW * 4, y);
        y += 5;
      });
      // Totals
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", 16, y);
      doc.text(Math.round(totalExpected).toLocaleString("pt-BR"), 16 + colW * 2, y);
      doc.text(Math.round(totalGenerated).toLocaleString("pt-BR"), 16 + colW * 3, y);
      doc.text(totalExpected > 0 ? `${Math.round((totalGenerated / totalExpected) * 100)}%` : "—", 16 + colW * 4, y);
      doc.setFont("helvetica", "normal");
      y += 8;

      // 3. Rateio de Créditos
      if (rateiData.length > 0) {
        addSection("3. Rateio de Créditos por Unidade Consumidora");
        doc.setFontSize(7);
        const ratHeaders = ["Unidade (UC)", "Consumo (kWh)", "Geração (kWh)", "Saldo Créditos", "Valor (R$)"];
        doc.setFillColor(59, 130, 246);
        doc.setTextColor(255, 255, 255);
        doc.rect(14, y - 4, pageW - 28, 6, "F");
        ratHeaders.forEach((h, i) => doc.text(h, 16 + i * colW, y));
        y += 5;
        doc.setTextColor(34, 34, 34);
        rateiData.forEach((r, idx) => {
          addCheckPage();
          if (idx % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(14, y - 3.5, pageW - 28, 5, "F"); }
          doc.text(r.locationName.slice(0, 22), 16, y);
          doc.text(Math.round(r.totalConsumption).toLocaleString("pt-BR"), 16 + colW, y);
          doc.text(Math.round(r.totalGeneration).toLocaleString("pt-BR"), 16 + colW * 2, y);
          doc.text(Math.round(r.creditBalance).toLocaleString("pt-BR"), 16 + colW * 3, y);
          doc.text(`R$ ${r.totalValue.toFixed(2)}`, 16 + colW * 4, y);
          y += 5;
        });
        y += 4;
      }

      // 4. Status Operacional
      addSection("4. Status Operacional dos Ativos");
      doc.setFontSize(8);
      doc.text(`Total de alertas no semestre: ${semesterAlerts.length}`, 16, y); y += 5;
      alertsByType.forEach((a) => { doc.text(`• ${a.type}: ${a.count} ocorrência(s)`, 18, y); y += 4; });
      y += 4;

      // Checklist if active
      if (showChecklist) {
        addSection("5. Levantamento Inicial — Checklist (Art. 5º)");
        doc.setFontSize(8);
        checklist.forEach((item: any) => {
          addCheckPage();
          doc.text(`[${item.done ? "✓" : " "}] ${item.label}`, 16, y);
          y += 5;
        });
        y += 4;
      }

      // 6. Conclusão
      if (aiResult?.conclusaoRecomendacoes) {
        addSection(`${showChecklist ? "6" : "5"}. Conclusão e Recomendações`);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(aiResult.conclusaoRecomendacoes, pageW - 28);
        for (const line of lines) {
          addCheckPage();
          doc.text(line, 14, y);
          y += 4;
        }
        y += 6;
      }

      // Signature line
      addCheckPage();
      y += 10;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(pageW / 2 - 40, y, pageW / 2 + 40, y);
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(34, 34, 34);
      doc.text("Superintendente", pageW / 2, y, { align: "center" });

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      const nowDt = new Date();
      const footerText = `Gerado por: ${user?.user_metadata?.full_name || user?.email || "Usuário"} em ${nowDt.toLocaleDateString("pt-BR")} às ${nowDt.toLocaleTimeString("pt-BR")}`;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.setTextColor(120, 120, 120);
        doc.text(footerText, pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
        doc.text(`Página ${p} de ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
      }

      const now = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
      doc.save(`relatorio-semestral-${semester}sem-${year}-${now}.pdf`);
      toast({ title: "PDF exportado!" });
    } catch (err: any) {
      toast({ title: "Erro ao exportar PDF", description: err.message, variant: "destructive" });
    }
  }, [aiResult, generationByPlantMonth, rateiData, semesterAlerts, alertsByType, totalSaving, totalGenerated, totalExpected, tariffValue, semesterLabel, commission, showChecklist, checklist, year, semester, user, toast]);

  // Export Excel
  const handleExportExcel = useCallback(async () => {
    try {
      const XLSX = await import("xlsx-js-style");
      const wb = XLSX.utils.book_new();

      // Summary
      const summaryRows = [
        { Indicador: "Período", Valor: semesterLabel },
        { Indicador: "Tarifa Média (R$/kWh)", Valor: tariffValue.toFixed(2) },
        { Indicador: "Geração Total (kWh)", Valor: Math.round(totalGenerated).toLocaleString("pt-BR") },
        { Indicador: "Geração Prevista (kWh)", Valor: Math.round(totalExpected).toLocaleString("pt-BR") },
        { Indicador: "Economia Total (R$)", Valor: `R$ ${totalSaving.toFixed(2)}` },
        { Indicador: "Desempenho (%)", Valor: totalExpected > 0 ? `${Math.round((totalGenerated / totalExpected) * 100)}%` : "—" },
        { Indicador: "Alertas no Semestre", Valor: String(semesterAlerts.length) },
      ];
      const s1 = XLSX.utils.json_to_sheet(summaryRows);
      autoFitColumns(s1, summaryRows);
      XLSX.utils.book_append_sheet(wb, s1, "Resumo");

      // Generation detail
      const genRows = generationByPlantMonth.map((r) => ({
        Usina: r.plantName, Mês: r.monthLabel,
        "Previsto (kWh)": Math.round(r.expectedKwh),
        "Realizado (kWh)": Math.round(r.generated),
        "Desempenho (%)": Math.round(r.performance),
      }));
      const s2 = XLSX.utils.json_to_sheet(genRows);
      autoFitColumns(s2, genRows);
      XLSX.utils.book_append_sheet(wb, s2, "Geração");

      // Rateio
      if (rateiData.length > 0) {
        const ratRows = rateiData.map((r) => ({
          "Unidade Consumidora": r.locationName,
          "Consumo (kWh)": Math.round(r.totalConsumption),
          "Geração (kWh)": Math.round(r.totalGeneration),
          "Saldo Créditos": Math.round(r.creditBalance),
          "Valor Total (R$)": r.totalValue.toFixed(2),
          "Nº Faturas": r.bills,
        }));
        const s3 = XLSX.utils.json_to_sheet(ratRows);
        autoFitColumns(s3, ratRows);
        XLSX.utils.book_append_sheet(wb, s3, "Rateio UC");
      }

      // Alerts
      if (semesterAlerts.length > 0) {
        const alertRows = semesterAlerts.map((a: any) => ({
          Tipo: a.type, Mensagem: a.message,
          Data: new Date(a.created_at).toLocaleDateString("pt-BR"),
          Resolvido: a.resolved ? "Sim" : "Não",
        }));
        const s4 = XLSX.utils.json_to_sheet(alertRows);
        autoFitColumns(s4, alertRows);
        XLSX.utils.book_append_sheet(wb, s4, "Alertas");
      }

      const now = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
      XLSX.writeFile(wb, `relatorio-semestral-${semester}sem-${year}-${now}.xlsx`);
      toast({ title: "Excel exportado!" });
    } catch (err: any) {
      toast({ title: "Erro ao exportar Excel", description: err.message, variant: "destructive" });
    }
  }, [generationByPlantMonth, rateiData, semesterAlerts, totalSaving, totalGenerated, totalExpected, tariffValue, semesterLabel, year, semester, toast]);

  const isLoading = loadingPlants || loadingAlerts || loadingEnergy;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 shadow-card">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Semestre</Label>
          <Select value={selectedSemester} onValueChange={setSelectedSemester}>
            <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1º Semestre (Jan-Jun)</SelectItem>
              <SelectItem value="2">2º Semestre (Jul-Dez)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tarifa Média (R$/kWh)</Label>
          <Input type="number" step="0.01" value={tariff} onChange={(e) => setTariff(e.target.value)} className="w-[130px] h-9 text-sm" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Switch checked={showChecklist} onCheckedChange={setShowChecklist} id="checklist-toggle" />
          <Label htmlFor="checklist-toggle" className="text-xs cursor-pointer">Modo Levantamento Inicial (Art. 5º)</Label>
        </div>
      </div>

      {/* Saving Highlight */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-primary p-6 text-primary-foreground shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="h-6 w-6" />
          <span className="text-sm font-medium opacity-90">Economia Total — {semesterLabel}</span>
        </div>
        <p className="text-3xl md:text-4xl font-bold">
          R$ {totalSaving.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm opacity-80 mt-1">
          Geração: {(totalGenerated / 1000).toFixed(1)} MWh | Prevista: {(totalExpected / 1000).toFixed(1)} MWh |
          Desempenho: {totalExpected > 0 ? `${Math.round((totalGenerated / totalExpected) * 100)}%` : "—"}
        </p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: "Geração Total", value: `${(totalGenerated / 1000).toFixed(1)} MWh` },
          { icon: BarChart3, label: "Previsto", value: `${(totalExpected / 1000).toFixed(1)} MWh` },
          { icon: AlertTriangle, label: "Alertas no Período", value: String(semesterAlerts.length) },
          { icon: Users, label: "Unidades Consumidoras", value: String(rateiData.length) },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <item.icon className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-xl font-bold">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* AI Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Análise por Inteligência Artificial
            </CardTitle>
            <button onClick={handleGenerateAI} disabled={generating}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generating ? "Gerando..." : "Gerar Análise com IA"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {aiResult ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Resumo Executivo
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line text-justify">{aiResult.resumoExecutivo}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Conclusão e Recomendações
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line text-justify">{aiResult.conclusaoRecomendacoes}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Clique em "Gerar Análise com IA" para criar o Resumo Executivo e as Recomendações do relatório.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Table: Prevista vs Realizada */}
      {generationByPlantMonth.length > 0 && (
        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Geração Prevista vs. Realizada</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left p-3 font-medium">Usina</th>
                  <th className="text-left p-3 font-medium">Mês</th>
                  <th className="text-right p-3 font-medium">Previsto (kWh)</th>
                  <th className="text-right p-3 font-medium">Realizado (kWh)</th>
                  <th className="text-right p-3 font-medium">Desempenho</th>
                </tr>
              </thead>
              <tbody>
                {generationByPlantMonth.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">{r.plantName}</td>
                    <td className="p-3 text-muted-foreground">{r.monthLabel}</td>
                    <td className="p-3 text-right font-mono">{Math.round(r.expectedKwh).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right font-mono">{Math.round(r.generated).toLocaleString("pt-BR")}</td>
                    <td className={`p-3 text-right font-mono font-semibold ${r.performance >= 80 ? "text-primary" : r.performance >= 50 ? "text-yellow-600" : "text-destructive"}`}>
                      {Math.round(r.performance)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold text-xs">
                  <td className="p-3" colSpan={2}>Total</td>
                  <td className="p-3 text-right font-mono">{Math.round(totalExpected).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right font-mono">{Math.round(totalGenerated).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right font-mono text-primary">
                    {totalExpected > 0 ? `${Math.round((totalGenerated / totalExpected) * 100)}%` : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Saving by Plant */}
      {savingByPlant.length > 0 && (
        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Economia por Usina</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left p-3 font-medium">Usina</th>
                  <th className="text-right p-3 font-medium">Geração (kWh)</th>
                  <th className="text-right p-3 font-medium">Economia (R$)</th>
                </tr>
              </thead>
              <tbody>
                {savingByPlant.map((s, i) => (
                  <tr key={i} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-right font-mono">{Math.round(s.generated).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right font-mono text-primary font-semibold">R$ {s.saving.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold text-xs">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right font-mono">{Math.round(totalGenerated).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right font-mono text-primary">R$ {totalSaving.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Rateio de Créditos por UC */}
      {rateiData.length > 0 && (
        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Rateio de Créditos por Unidade Consumidora (Art. 2º, II)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left p-3 font-medium">Unidade (UC)</th>
                  <th className="text-right p-3 font-medium">Consumo (kWh)</th>
                  <th className="text-right p-3 font-medium">Geração (kWh)</th>
                  <th className="text-right p-3 font-medium">Saldo Créditos</th>
                  <th className="text-right p-3 font-medium">Valor Total (R$)</th>
                  <th className="text-right p-3 font-medium">Faturas</th>
                </tr>
              </thead>
              <tbody>
                {rateiData.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">{r.locationName}</td>
                    <td className="p-3 text-right font-mono">{Math.round(r.totalConsumption).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right font-mono">{Math.round(r.totalGeneration).toLocaleString("pt-BR")}</td>
                    <td className={`p-3 text-right font-mono font-semibold ${r.creditBalance >= 0 ? "text-primary" : "text-destructive"}`}>
                      {Math.round(r.creditBalance).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-3 text-right font-mono">R$ {r.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right">{r.bills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alertas do Semestre */}
      <div className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Status Operacional — Alertas do Semestre</h3>
        </div>
        {semesterAlerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Mensagem</th>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {semesterAlerts.map((a: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.type === "critical" ? "bg-destructive/10 text-destructive" :
                        a.type === "warning" ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{a.type}</span>
                    </td>
                    <td className="p-3 text-muted-foreground">{a.message}</td>
                    <td className="p-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3">
                      {a.resolved ? (
                        <span className="text-primary text-xs font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Resolvido</span>
                      ) : (
                        <span className="text-destructive text-xs font-medium">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">Nenhum alerta registrado no período.</div>
        )}
      </div>

      {/* Checklist Art. 5º */}
      {showChecklist && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Levantamento Inicial — Checklist de Regularização (Art. 5º)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Prazo: 60 dias para sanar pendências históricas conforme Art. 5º da Portaria nº 11/2026.</p>
            <div className="space-y-3">
              {checklist.map((item: any, i: number) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Checkbox checked={item.done} onCheckedChange={(checked) => {
                    const updated = [...checklist];
                    updated[i] = { ...item, done: !!checked };
                    setChecklist(updated);
                  }} />
                  <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membros da Comissão */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Membros da Comissão (Art. 3º)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {commission.map((member, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{member.role}</Label>
                <Input
                  value={member.name}
                  onChange={(e) => {
                    const updated = [...commission];
                    updated[i] = { ...member, name: e.target.value };
                    setCommission(updated);
                  }}
                  placeholder={`Nome do ${member.role}`}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleExportPDF}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors">
          <Download className="h-4 w-4" /> Exportar PDF
        </button>
        <button onClick={handleExportExcel}
          className="flex items-center gap-1.5 border text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-muted transition-colors">
          <Download className="h-4 w-4" /> Exportar Excel
        </button>
      </div>
    </div>
  );
}
