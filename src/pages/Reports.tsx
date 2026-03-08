import { EnergyChart } from "@/components/EnergyChart";
import { FileBarChart, Download, Leaf, Zap, TrendingUp, Loader2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useEnergyData } from "@/hooks/useSupabaseData";
import { useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const { data: energyData = [], isLoading } = useEnergyData();
  const { toast } = useToast();

  const { monthlyChart, monthlyGen, injectedEnergy, estimatedSavings, co2Monthly } = useMemo(() => {
    if (energyData.length === 0) {
      return { monthlyChart: [], monthlyGen: 0, injectedEnergy: 0, estimatedSavings: 0, co2Monthly: 0 };
    }

    const monthMap = new Map<string, { generation: number; consumption: number }>();
    energyData.forEach((d) => {
      const date = new Date(d.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) || { generation: 0, consumption: 0 };
      entry.generation += (d.energy_generated_kwh || 0);
      entry.consumption += (d.energy_consumed_kwh || 0);
      monthMap.set(key, entry);
    });

    const sorted = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const monthlyChart = sorted.map(([key, val]) => {
      const [, m] = key.split("-");
      return {
        time: monthNames[parseInt(m, 10) - 1],
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
  }, [energyData]);

  const handleExportPDF = useCallback(async () => {
    if (monthlyChart.length === 0) {
      toast({ title: "Sem dados", description: "Não há dados para exportar.", variant: "destructive" });
      return;
    }

    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;

      const doc = new jsPDF();
      const now = new Date().toLocaleDateString("pt-BR");

      // Title
      doc.setFontSize(18);
      doc.setTextColor(34, 34, 34);
      doc.text("Relatório Energético", 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Gerado em ${now}`, 14, 30);

      // Summary section
      doc.setFontSize(12);
      doc.setTextColor(34, 34, 34);
      doc.text("Resumo Mensal (média)", 14, 44);

      const summaryItems = [
        ["Energia Gerada", `${(monthlyGen / 1000).toFixed(1)} MWh`],
        ["Energia Injetada", `${(injectedEnergy / 1000).toFixed(1)} MWh`],
        ["Economia Estimada", `R$ ${estimatedSavings.toFixed(0)}`],
        ["CO₂ Evitado", `${co2Monthly.toFixed(1)} ton`],
      ];

      doc.setFontSize(10);
      let y = 52;
      for (const [label, value] of summaryItems) {
        doc.setTextColor(80, 80, 80);
        doc.text(label, 14, y);
        doc.setTextColor(34, 34, 34);
        doc.text(value, 100, y);
        y += 8;
      }

      // Monthly table header
      y += 8;
      doc.setFontSize(12);
      doc.setTextColor(34, 34, 34);
      doc.text("Dados Mensais", 14, y);
      y += 8;

      // Table header
      doc.setFontSize(9);
      doc.setFillColor(59, 130, 246);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, y - 5, 182, 8, "F");
      doc.text("Mês", 16, y);
      doc.text("Geração (kWh)", 55, y);
      doc.text("Consumo (kWh)", 100, y);
      doc.text("Injetada (kWh)", 145, y);
      y += 8;

      // Table rows
      doc.setTextColor(34, 34, 34);
      for (let i = 0; i < monthlyChart.length; i++) {
        const row = monthlyChart[i];
        if (i % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(14, y - 5, 182, 7, "F");
        }
        doc.text(row.time, 16, y);
        doc.text(row.generation.toLocaleString("pt-BR"), 55, y);
        doc.text(row.consumption.toLocaleString("pt-BR"), 100, y);
        doc.text(Math.max(0, row.generation - row.consumption).toLocaleString("pt-BR"), 145, y);
        y += 7;
        if (y > 270) { doc.addPage(); y = 20; }
      }

      doc.save(`relatorio-energetico-${now.replace(/\//g, "-")}.pdf`);
      toast({ title: "PDF exportado!", description: "O relatório foi baixado com sucesso." });
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast({ title: "Erro ao exportar PDF", description: err.message, variant: "destructive" });
    }
  }, [monthlyChart, monthlyGen, injectedEnergy, estimatedSavings, co2Monthly, toast]);

  const handleExportExcel = useCallback(async () => {
    if (monthlyChart.length === 0) {
      toast({ title: "Sem dados", description: "Não há dados para exportar.", variant: "destructive" });
      return;
    }

    try {
      const XLSX = await import("xlsx");

      // Summary sheet
      const summaryRows = [
        { Indicador: "Energia Gerada (média/mês)", Valor: `${(monthlyGen / 1000).toFixed(1)} MWh` },
        { Indicador: "Energia Injetada (média/mês)", Valor: `${(injectedEnergy / 1000).toFixed(1)} MWh` },
        { Indicador: "Economia Estimada", Valor: `R$ ${estimatedSavings.toFixed(0)}` },
        { Indicador: "CO₂ Evitado (média/mês)", Valor: `${co2Monthly.toFixed(1)} ton` },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

      // Monthly data sheet
      const monthlyRows = monthlyChart.map((row) => ({
        Mês: row.time,
        "Geração (kWh)": row.generation,
        "Consumo (kWh)": row.consumption,
        "Injetada (kWh)": Math.max(0, row.generation - row.consumption),
      }));
      const monthlySheet = XLSX.utils.json_to_sheet(monthlyRows);

      // Raw data sheet (last 500 records)
      const rawRows = energyData.slice(0, 500).map((d) => ({
        Data: new Date(d.timestamp).toLocaleString("pt-BR"),
        "Geração (kWh)": d.energy_generated_kwh || 0,
        "Consumo (kWh)": d.energy_consumed_kwh || 0,
        "Potência Geração (kW)": d.generation_power_kw || 0,
        "Potência Consumo (kW)": d.consumption_power_kw || 0,
        Status: d.status || "",
      }));
      const rawSheet = XLSX.utils.json_to_sheet(rawRows);

      // Set column widths
      summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
      monthlySheet["!cols"] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      rawSheet["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, summarySheet, "Resumo");
      XLSX.utils.book_append_sheet(wb, monthlySheet, "Mensal");
      XLSX.utils.book_append_sheet(wb, rawSheet, "Dados Brutos");

      const now = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
      XLSX.writeFile(wb, `relatorio-energetico-${now}.xlsx`);
      toast({ title: "Excel exportado!", description: "A planilha foi baixada com sucesso." });
    } catch (err: any) {
      console.error("Excel export error:", err);
      toast({ title: "Erro ao exportar Excel", description: err.message, variant: "destructive" });
    }
  }, [monthlyChart, monthlyGen, injectedEnergy, estimatedSavings, co2Monthly, energyData, toast]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análise energética e exportação de dados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={!hasData}
            className="flex items-center gap-2 border text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!hasData}
            className="flex items-center gap-2 border text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" /> Excel
          </button>
        </div>
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

      {hasData ? (
        <EnergyChart data={monthlyChart} title="Geração vs Consumo — Mensal (kWh)" height={350} />
      ) : (
        <div className="rounded-xl bg-card p-12 shadow-card flex flex-col items-center justify-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">Sem dados de energia</p>
          <p className="text-sm">Os dados aparecerão aqui após a primeira sincronização das usinas.</p>
        </div>
      )}
    </div>
  );
}
