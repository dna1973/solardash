import { EnergyChart } from "@/components/EnergyChart";
import { FileBarChart, Download, Leaf, Zap, TrendingUp, Loader2, BarChart3, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { useEnergyData, usePlants } from "@/hooks/useSupabaseData";
import { useMemo, useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getYearOptions(data: any[]) {
  const years = new Set<number>();
  data.forEach((d) => years.add(new Date(d.timestamp).getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}

export default function Reports() {
  const { data: energyData = [], isLoading: loadingEnergy } = useEnergyData();
  const { data: plantsData = [], isLoading: loadingPlants } = usePlants();
  const { toast } = useToast();

  const [selectedPlant, setSelectedPlant] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const years = useMemo(() => getYearOptions(energyData), [energyData]);

  const filteredData = useMemo(() => {
    let data = energyData;
    if (selectedPlant !== "all") {
      data = data.filter((d) => d.plant_id === selectedPlant);
    }
    if (selectedYear !== "all") {
      const y = parseInt(selectedYear);
      data = data.filter((d) => new Date(d.timestamp).getFullYear() === y);
    }
    return data;
  }, [energyData, selectedPlant, selectedYear]);

  const { monthlyChart, monthlyGen, injectedEnergy, estimatedSavings, co2Monthly } = useMemo(() => {
    if (filteredData.length === 0) {
      return { monthlyChart: [], monthlyGen: 0, injectedEnergy: 0, estimatedSavings: 0, co2Monthly: 0 };
    }

    const monthMap = new Map<string, { generation: number; consumption: number }>();
    filteredData.forEach((d) => {
      const date = new Date(d.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) || { generation: 0, consumption: 0 };
      entry.generation += (d.energy_generated_kwh || 0);
      entry.consumption += (d.energy_consumed_kwh || 0);
      monthMap.set(key, entry);
    });

    const sorted = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    const monthlyChart = sorted.map(([key, val]) => {
      const [, m] = key.split("-");
      return {
        time: MONTH_NAMES[parseInt(m, 10) - 1],
        generation: Math.round(val.generation),
        consumption: Math.round(val.consumption),
      };
    });

    const totalGen = sorted.reduce((sum, [, v]) => sum + v.generation, 0);
    const totalCon = sorted.reduce((sum, [, v]) => sum + v.consumption, 0);
    const months = sorted.length || 1;
    const avgMonthlyGen = totalGen / months;
    const injected = Math.max(0, totalGen - totalCon) / months;

    return {
      monthlyChart,
      monthlyGen: avgMonthlyGen,
      injectedEnergy: injected,
      estimatedSavings: avgMonthlyGen * 0.75 / 100,
      co2Monthly: avgMonthlyGen * 0.42 / 1000,
    };
  }, [filteredData]);

  // Comparativo entre usinas
  const comparisonData = useMemo(() => {
    if (plantsData.length <= 1) return [];

    const plantMap = new Map<string, { name: string; generation: number; consumption: number }>();
    plantsData.forEach((p: any) => {
      plantMap.set(p.id, { name: p.name, generation: 0, consumption: 0 });
    });

    let data = energyData;
    if (selectedYear !== "all") {
      const y = parseInt(selectedYear);
      data = data.filter((d) => new Date(d.timestamp).getFullYear() === y);
    }

    data.forEach((d) => {
      const entry = plantMap.get(d.plant_id);
      if (entry) {
        entry.generation += (d.energy_generated_kwh || 0);
        entry.consumption += (d.energy_consumed_kwh || 0);
      }
    });

    return Array.from(plantMap.values())
      .filter((p) => p.generation > 0 || p.consumption > 0)
      .map((p) => ({
        name: p.name.length > 18 ? p.name.slice(0, 16) + "…" : p.name,
        generation: Math.round(p.generation),
        consumption: Math.round(p.consumption),
      }))
      .sort((a, b) => b.generation - a.generation);
  }, [energyData, plantsData, selectedYear]);

  // Tabela detalhada por usina/mês
  const detailedTable = useMemo(() => {
    const rows: Array<{ plant: string; month: string; monthKey: string; generation: number; consumption: number; injected: number }> = [];
    const map = new Map<string, { plant: string; month: string; monthKey: string; generation: number; consumption: number }>();

    let data = energyData;
    if (selectedYear !== "all") {
      const y = parseInt(selectedYear);
      data = data.filter((d) => new Date(d.timestamp).getFullYear() === y);
    }
    if (selectedPlant !== "all") {
      data = data.filter((d) => d.plant_id === selectedPlant);
    }

    const plantNames = new Map<string, string>();
    plantsData.forEach((p: any) => plantNames.set(p.id, p.name));

    data.forEach((d) => {
      const date = new Date(d.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const key = `${d.plant_id}|${monthKey}`;
      const entry = map.get(key) || {
        plant: plantNames.get(d.plant_id) || "—",
        month: `${MONTH_NAMES[date.getMonth()]}/${date.getFullYear()}`,
        monthKey,
        generation: 0,
        consumption: 0,
      };
      entry.generation += (d.energy_generated_kwh || 0);
      entry.consumption += (d.energy_consumed_kwh || 0);
      map.set(key, entry);
    });

    map.forEach((v) => {
      rows.push({ ...v, injected: Math.max(0, v.generation - v.consumption) });
    });

    return rows.sort((a, b) => b.monthKey.localeCompare(a.monthKey) || a.plant.localeCompare(b.plant));
  }, [energyData, plantsData, selectedPlant, selectedYear]);

  const handleExportPDF = useCallback(async () => {
    if (monthlyChart.length === 0) {
      toast({ title: "Sem dados", description: "Não há dados para exportar.", variant: "destructive" });
      return;
    }
    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      const doc = new jsPDF({ orientation: "landscape" });
      const now = new Date().toLocaleDateString("pt-BR");
      const plantLabel = selectedPlant === "all" ? "Todas as usinas" : (plantsData as any[]).find((p) => p.id === selectedPlant)?.name || "";
      const yearLabel = selectedYear === "all" ? "Todos os anos" : selectedYear;

      doc.setFontSize(18);
      doc.setTextColor(34, 34, 34);
      doc.text("Relatório Energético", 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`${plantLabel} • ${yearLabel} • Gerado em ${now}`, 14, 30);

      const summaryItems = [
        ["Energia Gerada (média/mês)", `${(monthlyGen / 1000).toFixed(1)} MWh`],
        ["Energia Injetada (média/mês)", `${(injectedEnergy / 1000).toFixed(1)} MWh`],
        ["Economia Estimada", `R$ ${estimatedSavings.toFixed(0)}`],
        ["CO₂ Evitado (média/mês)", `${co2Monthly.toFixed(1)} ton`],
      ];

      doc.setFontSize(10);
      let y = 42;
      for (const [label, value] of summaryItems) {
        doc.setTextColor(80, 80, 80);
        doc.text(label, 14, y);
        doc.setTextColor(34, 34, 34);
        doc.text(value, 100, y);
        y += 7;
      }

      y += 6;
      doc.setFontSize(12);
      doc.setTextColor(34, 34, 34);
      doc.text("Dados Mensais", 14, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFillColor(59, 130, 246);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, y - 5, 260, 8, "F");
      doc.text("Mês", 16, y);
      doc.text("Geração (kWh)", 70, y);
      doc.text("Consumo (kWh)", 130, y);
      doc.text("Injetada (kWh)", 190, y);
      y += 8;

      doc.setTextColor(34, 34, 34);
      for (let i = 0; i < monthlyChart.length; i++) {
        const row = monthlyChart[i];
        if (i % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(14, y - 5, 260, 7, "F");
        }
        doc.text(row.time, 16, y);
        doc.text(row.generation.toLocaleString("pt-BR"), 70, y);
        doc.text(row.consumption.toLocaleString("pt-BR"), 130, y);
        doc.text(Math.max(0, row.generation - row.consumption).toLocaleString("pt-BR"), 190, y);
        y += 7;
        if (y > 190) { doc.addPage(); y = 20; }
      }

      doc.save(`relatorio-energetico-${now.replace(/\//g, "-")}.pdf`);
      toast({ title: "PDF exportado!" });
    } catch (err: any) {
      toast({ title: "Erro ao exportar PDF", description: err.message, variant: "destructive" });
    }
  }, [monthlyChart, monthlyGen, injectedEnergy, estimatedSavings, co2Monthly, selectedPlant, selectedYear, plantsData, toast]);

  const handleExportExcel = useCallback(async () => {
    if (detailedTable.length === 0 && monthlyChart.length === 0) {
      toast({ title: "Sem dados", description: "Não há dados para exportar.", variant: "destructive" });
      return;
    }
    try {
      const XLSX = await import("xlsx");

      const summaryRows = [
        { Indicador: "Energia Gerada (média/mês)", Valor: `${(monthlyGen / 1000).toFixed(1)} MWh` },
        { Indicador: "Energia Injetada (média/mês)", Valor: `${(injectedEnergy / 1000).toFixed(1)} MWh` },
        { Indicador: "Economia Estimada", Valor: `R$ ${estimatedSavings.toFixed(0)}` },
        { Indicador: "CO₂ Evitado (média/mês)", Valor: `${co2Monthly.toFixed(1)} ton` },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];

      const detailedRows = detailedTable.map((r) => ({
        Usina: r.plant,
        Mês: r.month,
        "Geração (kWh)": Math.round(r.generation),
        "Consumo (kWh)": Math.round(r.consumption),
        "Injetada (kWh)": Math.round(r.injected),
      }));
      const detailedSheet = XLSX.utils.json_to_sheet(detailedRows);
      detailedSheet["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, summarySheet, "Resumo");
      XLSX.utils.book_append_sheet(wb, detailedSheet, "Detalhado");

      const now = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
      XLSX.writeFile(wb, `relatorio-energetico-${now}.xlsx`);
      toast({ title: "Excel exportado!" });
    } catch (err: any) {
      toast({ title: "Erro ao exportar Excel", description: err.message, variant: "destructive" });
    }
  }, [detailedTable, monthlyChart, monthlyGen, injectedEnergy, estimatedSavings, co2Monthly, toast]);

  const isLoading = loadingEnergy || loadingPlants;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasData = monthlyChart.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Análise energética detalhada com filtros e comparativos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={!hasData}
            className="flex items-center gap-1.5 border text-xs md:text-sm font-medium px-3 md:px-4 py-2 md:py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!hasData && detailedTable.length === 0}
            className="flex items-center gap-1.5 border text-xs md:text-sm font-medium px-3 md:px-4 py-2 md:py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 rounded-xl bg-card p-3 md:p-4 shadow-card">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs md:text-sm font-medium text-muted-foreground">Filtros:</span>

        <Select value={selectedPlant} onValueChange={setSelectedPlant}>
          <SelectTrigger className="w-full sm:w-[220px] h-9 text-sm">
            <SelectValue placeholder="Todas as usinas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as usinas</SelectItem>
            {(plantsData as any[]).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
            <SelectValue placeholder="Todos os anos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: "Energia Gerada (mês)", value: hasData ? `${(monthlyGen / 1000).toFixed(1)} MWh` : "—", color: "text-primary" },
          { icon: TrendingUp, label: "Energia Injetada", value: hasData ? `${(injectedEnergy / 1000).toFixed(1)} MWh` : "—", color: "text-energy-blue" },
          { icon: FileBarChart, label: "Economia Estimada", value: hasData ? `R$ ${estimatedSavings.toFixed(0)}` : "—", color: "text-accent" },
          { icon: Leaf, label: "CO₂ Evitado (mês)", value: hasData ? `${co2Monthly.toFixed(1)} ton` : "—", color: "text-primary" },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-xl font-bold">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Monthly Chart */}
      {hasData ? (
        <EnergyChart data={monthlyChart} title="Geração vs Consumo — Mensal (kWh)" height={320} />
      ) : (
        <div className="rounded-xl bg-card p-12 shadow-card flex flex-col items-center justify-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">Sem dados de energia</p>
          <p className="text-sm">Os dados aparecerão aqui após a primeira sincronização das usinas.</p>
        </div>
      )}

      {/* Comparison Chart */}
      {comparisonData.length > 1 && (
        <div className="rounded-xl bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold mb-4">Comparativo entre Usinas (kWh)</h3>
          <ResponsiveContainer width="100%" height={Math.max(250, comparisonData.length * 45)}>
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} />
              <Tooltip
                contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(220, 13%, 90%)", borderRadius: "8px", fontSize: "12px" }}
                formatter={(value: number) => [`${value.toLocaleString("pt-BR")} kWh`]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="generation" name="Geração" fill="hsl(152, 60%, 42%)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="consumption" name="Consumo" fill="hsl(210, 80%, 55%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Table */}
      {detailedTable.length > 0 && (
        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold">Dados Detalhados por Usina / Mês</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left p-3 font-medium">Usina</th>
                  <th className="text-left p-3 font-medium">Mês</th>
                  <th className="text-right p-3 font-medium">Geração (kWh)</th>
                  <th className="text-right p-3 font-medium">Consumo (kWh)</th>
                  <th className="text-right p-3 font-medium">Injetada (kWh)</th>
                </tr>
              </thead>
              <tbody>
                {detailedTable.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">{row.plant}</td>
                    <td className="p-3 text-muted-foreground">{row.month}</td>
                    <td className="p-3 text-right font-mono">{Math.round(row.generation).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right font-mono">{Math.round(row.consumption).toLocaleString("pt-BR")}</td>
                    <td className="p-3 text-right font-mono text-primary font-semibold">{Math.round(row.injected).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold text-xs">
                  <td className="p-3" colSpan={2}>Total</td>
                  <td className="p-3 text-right font-mono">{detailedTable.reduce((s, r) => s + r.generation, 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="p-3 text-right font-mono">{detailedTable.reduce((s, r) => s + r.consumption, 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="p-3 text-right font-mono text-primary">{detailedTable.reduce((s, r) => s + r.injected, 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
