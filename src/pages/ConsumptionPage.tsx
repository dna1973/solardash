import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Search, Zap, TrendingUp, DollarSign, BarChart3, MapPin, Plug, FileUp, FileText, Trash2, Receipt, Download, Droplets, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { BillImportDialog } from "@/components/BillImportDialog";
import { WaterBillImportDialog } from "@/components/WaterBillImportDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface EnergyBill {
  id: string;
  property_name: string | null;
  address: string | null;
  utility_company: string | null;
  account_number: string | null;
  client_code: string | null;
  reference_month: string | null;
  consumption_kwh: number | null;
  generation_kwh: number | null;
  amount_brl: number | null;
  tariff_type: string | null;
  due_date: string | null;
  created_at: string;
  qd: string | null;
  invoice_number: string | null;
  invoice_value: number | null;
  gross_value: number | null;
  lighting_cost: number | null;
  deductions_value: number | null;
  net_value: number | null;
}

interface WaterBill {
  id: string;
  property_name: string | null;
  address: string | null;
  utility_company: string | null;
  account_number: string | null;
  client_code: string | null;
  reference_month: string | null;
  consumption_m3: number | null;
  water_value: number | null;
  sewer_value: number | null;
  total_value: number | null;
  tariff_type: string | null;
  due_date: string | null;
  invoice_number: string | null;
  consumption_history: Array<{ month: string; consumption_m3: number }> | null;
  created_at: string;
}

export default function ConsumptionPage() {
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [waterImportOpen, setWaterImportOpen] = useState(false);
  const [mainTab, setMainTab] = useState("properties");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  // Edit state
  const [editingBill, setEditingBill] = useState<EnergyBill | null>(null);
  const [editingWaterBill, setEditingWaterBill] = useState<WaterBill | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Property locations lookup (client_code → location_name)
  const [locationMap, setLocationMap] = useState<Record<string, string>>({});
  const [waterLocationMap, setWaterLocationMap] = useState<Record<string, string>>({});

  // Bills state
  const [bills, setBills] = useState<EnergyBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultYear = String(prevMonth.getFullYear());
  const defaultMonth = String(prevMonth.getMonth() + 1).padStart(2, "0");

  const [billFilterProperty, setBillFilterProperty] = useState("all");
  const [billFilterYear, setBillFilterYear] = useState(defaultYear);
  const [billFilterMonth, setBillFilterMonth] = useState(defaultMonth);

  // Water bills state
  const [waterBills, setWaterBills] = useState<WaterBill[]>([]);
  const [waterBillsLoading, setWaterBillsLoading] = useState(false);
  const [waterFilterProperty, setWaterFilterProperty] = useState("all");
  const [waterFilterYear, setWaterFilterYear] = useState(defaultYear);
  const [waterFilterMonth, setWaterFilterMonth] = useState(defaultMonth);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("property_locations")
      .select("id, account_number, location_name")
      .order("location_name");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((r: any) => { map[r.account_number] = r.location_name; });
      setLocationMap(map);
    }
  };

  const fetchWaterLocations = async () => {
    const { data } = await supabase
      .from("property_locations")
      .select("id, water_account_number, location_name")
      .not("water_account_number", "is", null)
      .order("location_name");
    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach((r: any) => { if (r.water_account_number) map[r.water_account_number] = r.location_name; });
      setWaterLocationMap(map);
    }
  };

  const fetchBills = async () => {
    setBillsLoading(true);
    const { data, error } = await supabase
      .from("energy_bills")
      .select("id, property_name, address, utility_company, account_number, client_code, reference_month, consumption_kwh, generation_kwh, amount_brl, tariff_type, due_date, created_at, qd, invoice_number, invoice_value, gross_value, lighting_cost, deductions_value, net_value")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bills:", error);
    } else {
      setBills(data || []);
    }
    setBillsLoading(false);
  };

  const fetchWaterBills = async () => {
    setWaterBillsLoading(true);
    const { data, error } = await supabase
      .from("water_bills" as any)
      .select("id, property_name, address, utility_company, account_number, client_code, reference_month, consumption_m3, water_value, sewer_value, total_value, tariff_type, due_date, invoice_number, consumption_history, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching water bills:", error);
    } else {
      setWaterBills((data as any[]) || []);
    }
    setWaterBillsLoading(false);
  };

  // Helper: resolve "local" for a bill
  const getLocal = (b: EnergyBill) => {
    if (b.client_code && locationMap[b.client_code]) return locationMap[b.client_code];
    return b.property_name || "Sem identificação";
  };

  const getWaterLocal = (b: WaterBill) => {
    if (b.account_number && waterLocationMap[b.account_number]) return waterLocationMap[b.account_number];
    if (b.client_code && waterLocationMap[b.client_code]) return waterLocationMap[b.client_code];
    return b.property_name || "Sem identificação";
  };

  useEffect(() => {
    fetchLocations();
    fetchWaterLocations();
    fetchBills();
    fetchWaterBills();
  }, []);

  const deleteBill = async (id: string) => {
    const { error } = await supabase.from("energy_bills").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir conta");
    } else {
      toast.success("Conta excluída");
      setBills((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const deleteWaterBill = async (id: string) => {
    const { error } = await supabase.from("water_bills" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir conta de água");
    } else {
      toast.success("Conta de água excluída");
      setWaterBills((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const saveEditBill = async () => {
    if (!editingBill) return;
    setEditSaving(true);
    const { id, created_at, ...rest } = editingBill;
    const { error } = await supabase.from("energy_bills").update({
      account_number: rest.account_number,
      property_name: rest.property_name,
      address: rest.address,
      utility_company: rest.utility_company,
      client_code: rest.client_code,
      reference_month: rest.reference_month,
      consumption_kwh: rest.consumption_kwh,
      generation_kwh: rest.generation_kwh,
      amount_brl: rest.amount_brl,
      tariff_type: rest.tariff_type,
      due_date: rest.due_date,
      invoice_number: rest.invoice_number,
      invoice_value: rest.invoice_value,
      gross_value: rest.gross_value,
      lighting_cost: rest.lighting_cost,
      deductions_value: rest.deductions_value,
      net_value: rest.net_value,
    }).eq("id", id);
    setEditSaving(false);
    if (error) {
      toast.error("Erro ao salvar alterações");
    } else {
      toast.success("Conta atualizada!");
      setBills((prev) => prev.map((b) => b.id === id ? editingBill : b));
      setEditingBill(null);
    }
  };

  const saveEditWaterBill = async () => {
    if (!editingWaterBill) return;
    setEditSaving(true);
    const { id, created_at, consumption_history, ...rest } = editingWaterBill;
    const { error } = await supabase.from("water_bills" as any).update({
      account_number: rest.account_number,
      property_name: rest.property_name,
      address: rest.address,
      utility_company: rest.utility_company,
      client_code: rest.client_code,
      reference_month: rest.reference_month,
      consumption_m3: rest.consumption_m3,
      water_value: rest.water_value,
      sewer_value: rest.sewer_value,
      total_value: rest.total_value,
      tariff_type: rest.tariff_type,
      due_date: rest.due_date,
      invoice_number: rest.invoice_number,
    }).eq("id", id);
    setEditSaving(false);
    if (error) {
      toast.error("Erro ao salvar alterações");
    } else {
      toast.success("Conta de água atualizada!");
      setWaterBills((prev) => prev.map((b) => b.id === id ? editingWaterBill : b));
      setEditingWaterBill(null);
    }
  };

  // Derive unique filters from bills
  const uniqueProperties = [...new Set(bills.map((b) => getLocal(b)).filter(Boolean))] as string[];
  const uniqueYears = [...new Set(bills.map((b) => b.reference_month?.split("/")?.[1]).filter(Boolean))].sort() as string[];
  const uniqueMonths = [...new Set(bills.map((b) => b.reference_month?.split("/")?.[0]).filter(Boolean))].sort() as string[];
  const monthNames: Record<string, string> = { "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril", "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto", "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro" };

  const filteredBills = bills.filter((b) => {
    const [mm, yyyy] = (b.reference_month || "").split("/");
    const matchProperty = billFilterProperty === "all" || getLocal(b) === billFilterProperty;
    const matchYear = billFilterYear === "all" || yyyy === billFilterYear;
    const matchMonth = billFilterMonth === "all" || mm === billFilterMonth;
    return matchProperty && matchYear && matchMonth;
  });

  // Water bill filters
  const uniqueWaterProperties = [...new Set(waterBills.map((b) => getWaterLocal(b)).filter(Boolean))] as string[];
  const uniqueWaterYears = [...new Set(waterBills.map((b) => b.reference_month?.split("/")?.[1]).filter(Boolean))].sort() as string[];
  const uniqueWaterMonths = [...new Set(waterBills.map((b) => b.reference_month?.split("/")?.[0]).filter(Boolean))].sort() as string[];

  const filteredWaterBills = waterBills.filter((b) => {
    const [mm, yyyy] = (b.reference_month || "").split("/");
    const matchProperty = waterFilterProperty === "all" || getWaterLocal(b) === waterFilterProperty;
    const matchYear = waterFilterYear === "all" || yyyy === waterFilterYear;
    const matchMonth = waterFilterMonth === "all" || mm === waterFilterMonth;
    return matchProperty && matchYear && matchMonth;
  });

  const waterTotalConsumption = filteredWaterBills.reduce((s, b) => s + (b.consumption_m3 || 0), 0);
  const waterTotalWater = filteredWaterBills.reduce((s, b) => s + (b.water_value || 0), 0);
  const waterTotalSewer = filteredWaterBills.reduce((s, b) => s + (b.sewer_value || 0), 0);
  const waterTotalValue = filteredWaterBills.reduce((s, b) => s + (b.total_value || 0), 0);

  const billsTotalConsumption = filteredBills.reduce((s, b) => s + (b.consumption_kwh || 0), 0);
  const billsTotalDeductions = filteredBills.reduce((s, b) => s + ((b as any).deductions_value || 0), 0);
  const billsTotalNet = filteredBills.reduce((s, b) => s + ((b as any).net_value || 0), 0);
  const billsTotalGross = billsTotalNet + billsTotalDeductions;

  const getBillsExportData = () =>
    filteredBills.map((b, i) => ({
      "Nº": i + 1,
      "Nº da Conta": b.account_number || "—",
      "Local": getLocal(b),
      "Consumo KW/H": b.consumption_kwh || 0,
      "Valor Bruto": (b.net_value || 0) + (b.deductions_value || 0),
      "Valor Iluminação Pública": b.lighting_cost || 0,
      "Valor Deduções": b.deductions_value || 0,
      "Valor Líquido": b.net_value || 0,
    }));

  const exportExcel = () => {
    const data = getBillsExportData();
    if (data.length === 0) { toast.error("Nenhuma conta para exportar"); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas");
    XLSX.writeFile(wb, "contas-energia.xlsx");
    toast.success("Excel exportado!");
  };

  const exportWaterExcel = () => {
    const data = filteredWaterBills.map((b, i) => ({
      "Nº": i + 1,
      "Matrícula": b.account_number || "—",
      "Local": getWaterLocal(b),
      "Consumo (m³)": b.consumption_m3 || 0,
      "Valor Água (R$)": b.water_value || 0,
      "Valor Esgoto (R$)": b.sewer_value || 0,
      "Valor Total (R$)": b.total_value || 0,
    }));
    if (data.length === 0) { toast.error("Nenhuma conta para exportar"); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas Água");
    XLSX.writeFile(wb, "contas-agua.xlsx");
    toast.success("Excel exportado!");
  };

  const exportWaterPDF = () => {
    const data = filteredWaterBills.map((b, i) => ({
      "Nº": i + 1,
      "Matrícula": b.account_number || "—",
      "Local": getWaterLocal(b),
      "Consumo (m³)": b.consumption_m3 || 0,
      "Valor Água (R$)": b.water_value || 0,
      "Valor Esgoto (R$)": b.sewer_value || 0,
      "Valor Total (R$)": b.total_value || 0,
    }));
    if (data.length === 0) { toast.error("Nenhuma conta para exportar"); return; }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = 297; const pageH = 210; const mx = 10; const tableW = pageW - mx * 2;

    const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
      doc.setFontSize(fontSize);
      const words = text.split(" "); const lines: string[] = []; let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (doc.getTextWidth(test) > maxWidth - 2) { if (current) lines.push(current); current = word; }
        else { current = test; }
      }
      if (current) lines.push(current);
      return lines.length ? lines : [""];
    };

    const fmtNum2 = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const fmtMoney2 = (v: number) => `R$ ${fmtNum2(v)}`;

    const wml = waterFilterMonth !== "all" ? (monthNames[waterFilterMonth] || waterFilterMonth) : "";
    const wyl = waterFilterYear !== "all" ? waterFilterYear : "";
    const refLabel = [wml, wyl].filter(Boolean).join("/") || "Todos";
    const propLabel = waterFilterProperty !== "all" ? waterFilterProperty : "Todos os imóveis";

    let y = 14; const headerH = 28;
    doc.setFillColor(230, 244, 255); doc.rect(mx, y - 4, tableW, headerH, "F");
    doc.setDrawColor(160, 200, 230); doc.rect(mx, y - 4, tableW, headerH, "S");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 30, 30);
    doc.text("EXTRATO DE CONTAS DE ÁGUA", mx + 3, y + 1);
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
    doc.text("Mês de Referência:", mx + 3, y + 7);
    doc.setFont("helvetica", "bold"); doc.text(refLabel, mx + 3 + doc.getTextWidth("Mês de Referência: "), y + 7);
    doc.setFont("helvetica", "normal"); doc.text("Imóvel:", mx + 3, y + 12);
    doc.setFont("helvetica", "bold");
    const propLines = wrapText(propLabel, 90, 7);
    propLines.forEach((line, i) => { doc.text(line, mx + 3 + doc.getTextWidth("Imóvel: "), y + 12 + i * 3.5); });

    const rightX = pageW - mx - 85;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
    [{ label: "Valor Água:", value: fmtMoney2(waterTotalWater) },
     { label: "Valor Esgoto:", value: fmtMoney2(waterTotalSewer) },
     { label: "Valor Total:", value: fmtMoney2(waterTotalValue) }].forEach((item, i) => {
      doc.setFont("helvetica", "normal"); doc.text(item.label, rightX, y + 1 + i * 5);
      doc.setFont("helvetica", "bold"); doc.text(item.value, rightX + 80, y + 1 + i * 5, { align: "right" });
    });

    y += headerH + 4;
    const cols = [
      { header: "Nº", width: 12, align: "left" as const },
      { header: "MATRÍCULA", width: 30, align: "left" as const },
      { header: "LOCAL", width: 90, align: "left" as const },
      { header: "CONSUMO\n(m³)", width: 30, align: "right" as const },
      { header: "Valor\nÁgua", width: 35, align: "right" as const },
      { header: "Valor\nEsgoto", width: 35, align: "right" as const },
      { header: "Valor\nTotal", width: 35, align: "right" as const },
    ];
    const usedW2 = cols.reduce((s, c) => s + c.width, 0);
    if (usedW2 < tableW) cols[cols.length - 1].width += tableW - usedW2;

    const drawWaterHeader = () => {
      doc.setFillColor(200, 225, 245); doc.rect(mx, y, tableW, 10, "F");
      doc.setDrawColor(160, 185, 210); doc.rect(mx, y, tableW, 10, "S");
      let cx = mx; doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(30, 30, 30);
      cols.forEach((col) => {
        const colLines = col.header.split("\n"); const textY = colLines.length > 1 ? y + 3 : y + 5;
        colLines.forEach((line, li) => {
          const colTx = col.align === "right" ? cx + col.width - 2 : cx + 2;
          doc.text(line, colTx, textY + li * 3.2, { align: col.align === "right" ? "right" : "left" });
        });
        doc.setDrawColor(180, 200, 220); doc.line(cx, y, cx, y + 10); cx += col.width;
      });
      doc.line(mx + tableW, y, mx + tableW, y + 10); y += 12;
    };

    drawWaterHeader();
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(30, 30, 30);
    const lineH = 3.5;

    data.forEach((row, rowIdx) => {
      const values = Object.values(row);
      const localText = String(values[2] || "");
      const localLines = wrapText(localText, cols[2].width, 6.5);
      const rowH = Math.max(localLines.length * lineH, 5);
      if (y + rowH > pageH - 20) { doc.addPage(); y = 14; drawWaterHeader(); }
      if (rowIdx % 2 === 0) { doc.setFillColor(245, 250, 255); doc.rect(mx, y - 2.5, tableW, rowH, "F"); }
      doc.setDrawColor(220, 230, 240); doc.line(mx, y - 2.5 + rowH, mx + tableW, y - 2.5 + rowH);
      let cx = mx;
      values.forEach((v, i) => {
        const col = cols[i]; if (!col) return;
        const text = typeof v === "number" ? (i === 0 ? String(Math.round(v)) : fmtNum2(v)) : String(v);
        if (i === 2) { localLines.forEach((line, li) => { doc.text(line, cx + 2, y + li * lineH); }); }
        else { const colTx = col.align === "right" ? cx + col.width - 2 : cx + 2; doc.text(text.substring(0, 30), colTx, y, { align: col.align === "right" ? "right" : "left" }); }
        doc.setDrawColor(220, 230, 240); doc.line(cx, y - 2.5, cx, y - 2.5 + rowH); cx += col.width;
      });
      doc.line(mx + tableW, y - 2.5, mx + tableW, y - 2.5 + rowH); y += rowH;
    });

    y += 1;
    doc.setDrawColor(160, 185, 210); doc.setFillColor(220, 238, 255);
    doc.rect(mx, y - 3, tableW, 7, "F"); doc.line(mx, y - 3, mx + tableW, y - 3); doc.line(mx, y + 4, mx + tableW, y + 4);
    const totalLabelX2 = cols.slice(0, 2).reduce((s, c) => s + c.width, 0) + mx + cols[2].width - 2;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7);
    doc.text("TOTAL:", totalLabelX2, y + 0.5, { align: "right" });
    const totalVals = [fmtNum2(waterTotalConsumption), fmtMoney2(waterTotalWater), fmtMoney2(waterTotalSewer), fmtMoney2(waterTotalValue)];
    let ttx = cols.slice(0, 3).reduce((s, c) => s + c.width, 0) + mx;
    totalVals.forEach((val, i) => { const col = cols[i + 3]; if (val) doc.text(val, ttx + col.width - 2, y + 0.5, { align: "right" }); ttx += col.width; });

    y += 10;
    const footerX = pageW - mx - 80;
    [{ label: "Valor Água", value: fmtMoney2(waterTotalWater) },
     { label: "Valor Esgoto", value: fmtMoney2(waterTotalSewer) },
     { label: "Valor Total", value: fmtMoney2(waterTotalValue) }].forEach((item, i) => {
      doc.setDrawColor(200, 220, 240); doc.line(footerX, y + i * 6 + 2, footerX + 80, y + i * 6 + 2);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(item.label, footerX + 2, y + i * 6);
      doc.setFont("helvetica", "bold"); doc.text(item.value, footerX + 78, y + i * 6, { align: "right" });
    });

    doc.save("extrato-contas-agua.pdf");
    toast.success("PDF exportado!");
  };

  const exportPDF = () => {
    const data = getBillsExportData();
    if (data.length === 0) { toast.error("Nenhuma conta para exportar"); return; }
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = 297;
    const pageH = 210;
    const mx = 10;
    const tableW = pageW - mx * 2;

    const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
      doc.setFontSize(fontSize);
      const words = text.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (doc.getTextWidth(test) > maxWidth - 2) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines.length ? lines : [""];
    };

    const fmtNum = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const fmtMoney = (v: number) => `R$ ${fmtNum(v)}`;

    const monthLabel = billFilterMonth !== "all" ? (monthNames[billFilterMonth] || billFilterMonth) : "";
    const yearLabel = billFilterYear !== "all" ? billFilterYear : "";
    const refLabel = [monthLabel, yearLabel].filter(Boolean).join("/") || "Todos";
    const propLabel = billFilterProperty !== "all" ? billFilterProperty : "Todos os imóveis";

    let y = 14;
    const headerH = 28;

    doc.setFillColor(240, 244, 248);
    doc.rect(mx, y - 4, tableW, headerH, "F");
    doc.setDrawColor(180, 190, 200);
    doc.rect(mx, y - 4, tableW, headerH, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("EXTRATO DE FATURAS", mx + 3, y + 1);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Mês de Referência:", mx + 3, y + 7);
    doc.setFont("helvetica", "bold");
    doc.text(refLabel, mx + 3 + doc.getTextWidth("Mês de Referência: "), y + 7);

    doc.setFont("helvetica", "normal");
    doc.text("Imóvel:", mx + 3, y + 12);
    doc.setFont("helvetica", "bold");
    const headerCol1W = 90;
    const propLines = wrapText(propLabel, headerCol1W, 7);
    propLines.forEach((line, i) => {
      doc.text(line, mx + 3 + doc.getTextWidth("Imóvel: "), y + 12 + i * 3.5);
    });

    const rightX = pageW - mx - 85;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);

    const summaryItems = [
      { label: "Valor Bruto:", value: fmtMoney(billsTotalGross) },
      { label: "Total de Dedução:", value: fmtMoney(billsTotalDeductions) },
      { label: "Valor Líquido:", value: fmtMoney(billsTotalNet) },
    ];
    summaryItems.forEach((item, i) => {
      doc.setFont("helvetica", "normal");
      doc.text(item.label, rightX, y + 1 + i * 5);
      doc.setFont("helvetica", "bold");
      doc.text(item.value, rightX + 80, y + 1 + i * 5, { align: "right" });
    });

    y += headerH + 4;

    const cols = [
      { header: "Nº", width: 12, align: "left" as const },
      { header: "Nº DA CONTA", width: 28, align: "left" as const },
      { header: "LOCAL", width: 78, align: "left" as const },
      { header: "CONSUMO\nKW/H", width: 28, align: "right" as const },
      { header: "Valor\nBruto", width: 28, align: "right" as const },
      { header: "Valor Ilum.\nPública", width: 28, align: "right" as const },
      { header: "Valor\nDeduções", width: 28, align: "right" as const },
      { header: "Valor\nLíquido", width: 28, align: "right" as const },
    ];
    const usedW = cols.reduce((s, c) => s + c.width, 0);
    if (usedW < tableW) cols[cols.length - 1].width += tableW - usedW;

    const drawTableHeader = () => {
      doc.setFillColor(200, 215, 230);
      doc.rect(mx, y, tableW, 10, "F");
      doc.setDrawColor(160, 175, 190);
      doc.rect(mx, y, tableW, 10, "S");

      let cx = mx;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(30, 30, 30);
      cols.forEach((col) => {
        const lines = col.header.split("\n");
        const textY = lines.length > 1 ? y + 3 : y + 5;
        lines.forEach((line, li) => {
          const tx = col.align === "right" ? cx + col.width - 2 : cx + 2;
          doc.text(line, tx, textY + li * 3.2, { align: col.align === "right" ? "right" : "left" });
        });
        doc.setDrawColor(180, 190, 200);
        doc.line(cx, y, cx, y + 10);
        cx += col.width;
      });
      doc.line(mx + tableW, y, mx + tableW, y + 10);
      y += 12;
    };

    drawTableHeader();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(30, 30, 30);
    const rowFontSize = 6.5;
    const lineH = 3.5;

    data.forEach((row, rowIdx) => {
      const values = Object.values(row);
      const localText = String(values[2] || "");
      const localLines = wrapText(localText, cols[2].width, rowFontSize);
      const rowH = Math.max(localLines.length * lineH, 5);

      if (y + rowH > pageH - 20) {
        doc.addPage();
        y = 14;
        drawTableHeader();
      }

      if (rowIdx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(mx, y - 2.5, tableW, rowH, "F");
      }

      doc.setDrawColor(220, 225, 230);
      doc.line(mx, y - 2.5 + rowH, mx + tableW, y - 2.5 + rowH);

      let cx = mx;
      values.forEach((v, i) => {
        const col = cols[i];
        if (!col) return;
        const text = typeof v === "number" ? (i === 0 ? String(Math.round(v)) : fmtNum(v)) : String(v);

        if (i === 2) {
          localLines.forEach((line, li) => {
            doc.text(line, cx + 2, y + li * lineH);
          });
        } else {
          const tx = col.align === "right" ? cx + col.width - 2 : cx + 2;
          doc.text(text.substring(0, 30), tx, y, { align: col.align === "right" ? "right" : "left" });
        }

        doc.setDrawColor(220, 225, 230);
        doc.line(cx, y - 2.5, cx, y - 2.5 + rowH);
        cx += col.width;
      });
      doc.line(mx + tableW, y - 2.5, mx + tableW, y - 2.5 + rowH);

      y += rowH;
    });

    y += 1;
    doc.setDrawColor(160, 175, 190);
    doc.setFillColor(230, 238, 245);
    doc.rect(mx, y - 3, tableW, 7, "F");
    doc.line(mx, y - 3, mx + tableW, y - 3);
    doc.line(mx, y + 4, mx + tableW, y + 4);

    const totalLabelX = cols.slice(0, 2).reduce((s, c) => s + c.width, 0) + mx + cols[2].width - 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("TOTAL:", totalLabelX, y + 0.5, { align: "right" });

    const totalValues = [
      fmtNum(billsTotalConsumption),
      fmtMoney(billsTotalGross),
      "",
      fmtMoney(billsTotalDeductions),
      fmtMoney(billsTotalNet),
    ];
    let tx = cols.slice(0, 3).reduce((s, c) => s + c.width, 0) + mx;
    totalValues.forEach((val, i) => {
      const col = cols[i + 3];
      if (val) {
        doc.text(val, tx + col.width - 2, y + 0.5, { align: "right" });
      }
      tx += col.width;
    });

    y += 10;
    const footerItems = [
      { label: "Valor Bruto", value: fmtMoney(billsTotalGross) },
      { label: "Total de Dedução", value: fmtMoney(billsTotalDeductions) },
      { label: "Valor Líquido", value: fmtMoney(billsTotalNet) },
    ];
    const footerX = pageW - mx - 80;
    footerItems.forEach((item, i) => {
      doc.setDrawColor(200, 210, 220);
      doc.line(footerX, y + i * 6 + 2, footerX + 80, y + i * 6 + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(item.label, footerX + 2, y + i * 6);
      doc.setFont("helvetica", "bold");
      doc.text(item.value, footerX + 78, y + i * 6, { align: "right" });
    });

    doc.save("extrato-faturas.pdf");
    toast.success("PDF exportado!");
  };

  // Aggregate bills by property for the "Imóveis" tab
  const propertiesMap = new Map<string, { name: string; address: string; utility: string; consumption: number; generation: number; cost: number; count: number; waterConsumption: number; waterCost: number; waterCount: number }>();
  bills.forEach((b) => {
    const key = getLocal(b);
    const existing = propertiesMap.get(key);
    if (existing) {
      existing.consumption += b.consumption_kwh || 0;
      existing.generation += b.generation_kwh || 0;
      existing.cost += b.amount_brl || 0;
      existing.count++;
    } else {
      propertiesMap.set(key, {
        name: getLocal(b),
        address: b.address || "—",
        utility: b.utility_company || "—",
        consumption: b.consumption_kwh || 0,
        generation: b.generation_kwh || 0,
        cost: b.amount_brl || 0,
        count: 1,
        waterConsumption: 0,
        waterCost: 0,
        waterCount: 0,
      });
    }
  });

  // Aggregate water bills into properties by matching location name
  waterBills.forEach((wb) => {
    const key = getWaterLocal(wb);
    const existing = propertiesMap.get(key);
    if (existing) {
      existing.waterConsumption += wb.consumption_m3 || 0;
      existing.waterCost += wb.total_value || 0;
      existing.waterCount++;
    } else {
      propertiesMap.set(key, {
        name: key,
        address: wb.address || "—",
        utility: wb.utility_company || "—",
        consumption: 0,
        generation: 0,
        cost: 0,
        count: 0,
        waterConsumption: wb.consumption_m3 || 0,
        waterCost: wb.total_value || 0,
        waterCount: 1,
      });
    }
  });

  const properties = Array.from(propertiesMap.entries()).map(([key, p]) => ({ id: key, ...p }));
  const filteredProperties = properties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.address.toLowerCase().includes(search.toLowerCase())
  );

  const totalConsumption = properties.reduce((s, p) => s + p.consumption, 0);
  const totalGeneration = properties.reduce((s, p) => s + p.generation, 0);
  const totalCost = properties.reduce((s, p) => s + p.cost, 0);
  const totalWaterConsumption = properties.reduce((s, p) => s + p.waterConsumption, 0);
  const totalWaterCost = properties.reduce((s, p) => s + p.waterCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consumo por Imóvel</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de consumo de energia e água por unidade consumidora
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
            <FileUp className="w-4 h-4" /> Importar Energia
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setWaterImportOpen(true)}>
            <Droplets className="w-4 h-4" /> Importar Água
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="properties" className="gap-2">
            <Building2 className="w-4 h-4" /> Imóveis
            {filteredProperties.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{filteredProperties.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bills" className="gap-2">
            <Receipt className="w-4 h-4" /> Contas de Energia
            {filteredBills.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{filteredBills.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="water" className="gap-2">
            <Droplets className="w-4 h-4" /> Contas de Água
            {filteredWaterBills.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{filteredWaterBills.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB: IMÓVEIS */}
        <TabsContent value="properties" className="space-y-6 mt-4">
          {properties.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum imóvel encontrado</p>
                <p className="text-xs text-muted-foreground mt-1">Importe contas de energia para visualizar os imóveis automaticamente</p>
                <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setImportOpen(true)}>
                  <FileUp className="w-4 h-4" /> Importar Conta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <StatCard title="Consumo Energia" value={`${(totalConsumption / 1000).toFixed(1)} MWh`} icon={Zap} variant="default" />
                <StatCard title="Geração Total" value={`${(totalGeneration / 1000).toFixed(1)} MWh`} icon={TrendingUp} variant="primary" />
                <StatCard title="Custo Energia" value={`R$ ${totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="default" />
                <StatCard title="Consumo Água" value={`${totalWaterConsumption.toFixed(1)} m³`} icon={Droplets} variant="default" />
                <StatCard title="Custo Água" value={`R$ ${totalWaterCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={Droplets} variant="default" />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar imóvel por nome ou endereço..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProperties.map((prop, i) => {
                  const balance = prop.generation - prop.consumption;
                  return (
                    <motion.div
                      key={prop.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card className="shadow-card hover:shadow-card-hover transition-shadow border-border/50 cursor-pointer" onClick={() => setSelectedProperty(prop.id)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div>
                                <CardTitle className="text-sm">{prop.name}</CardTitle>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" /> {prop.address}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {prop.count > 0 && <Badge variant="outline" className="text-[10px]"><Zap className="w-3 h-3 mr-0.5" />{prop.count}</Badge>}
                              {prop.waterCount > 0 && <Badge variant="outline" className="text-[10px]"><Droplets className="w-3 h-3 mr-0.5" />{prop.waterCount}</Badge>}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {prop.count > 0 && (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg bg-muted/50 p-2.5">
                                  <p className="text-[10px] text-muted-foreground">Consumo Energia</p>
                                  <p className="text-sm font-semibold font-mono">{(prop.consumption / 1000).toFixed(1)} MWh</p>
                                </div>
                                <div className="rounded-lg bg-muted/50 p-2.5">
                                  <p className="text-[10px] text-muted-foreground">Geração</p>
                                  <p className="text-sm font-semibold font-mono text-primary">{(prop.generation / 1000).toFixed(1)} MWh</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-muted-foreground">Custo Energia: </span>
                                  <span className="font-semibold">R$ {prop.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <span className={`font-semibold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                                  {balance >= 0 ? "Excedente" : "Déficit"} ({balance > 0 ? "+" : ""}{(balance / 1000).toFixed(1)} MWh)
                                </span>
                              </div>
                            </>
                          )}
                          {prop.waterCount > 0 && (
                            <div className={`grid grid-cols-2 gap-3 ${prop.count > 0 ? "border-t pt-3" : ""}`}>
                              <div className="rounded-lg bg-accent/50 p-2.5">
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Droplets className="w-3 h-3" /> Consumo Água</p>
                                <p className="text-sm font-semibold font-mono">{prop.waterConsumption.toFixed(1)} m³</p>
                              </div>
                              <div className="rounded-lg bg-accent/50 p-2.5">
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Droplets className="w-3 h-3" /> Custo Água</p>
                                <p className="text-sm font-semibold font-mono">R$ {prop.waterCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center text-[10px] text-muted-foreground border-t pt-2">
                            <span className="flex items-center gap-1"><Plug className="w-3 h-3" /> {prop.utility}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB: CONTAS DE ENERGIA */}
        <TabsContent value="bills" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard title="Consumo Total" value={`${(billsTotalConsumption / 1000).toFixed(1)} MWh`} icon={Zap} variant="default" />
            <StatCard title="Valor Bruto" value={`R$ ${billsTotalGross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="default" />
            <StatCard title="Total Deduções" value={`R$ ${billsTotalDeductions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={TrendingUp} variant="primary" />
            <StatCard title="Valor Líquido" value={`R$ ${billsTotalNet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="default" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={billFilterProperty} onValueChange={setBillFilterProperty}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Imóvel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os imóveis</SelectItem>
                {uniqueProperties.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billFilterYear} onValueChange={setBillFilterYear}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {uniqueYears.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billFilterMonth} onValueChange={setBillFilterMonth}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {uniqueMonths.map((m) => (
                  <SelectItem key={m} value={m}>{monthNames[m] || m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden sm:flex flex-1" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={exportExcel}>
                <Download className="w-4 h-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={exportPDF}>
                <Download className="w-4 h-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={() => setImportOpen(true)}>
                <FileUp className="w-4 h-4" /> Importar
              </Button>
            </div>
          </div>

          {billsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredBills.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma conta importada</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Importar Energia" para começar</p>
                <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setImportOpen(true)}>
                  <FileUp className="w-4 h-4" /> Importar Conta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                     <TableRow>
                      <TableHead>Nº da Conta</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead className="text-right">Consumo KW/H</TableHead>
                      <TableHead className="text-right">Valor Bruto</TableHead>
                      <TableHead className="text-right">Valor Ilum. Pública</TableHead>
                      <TableHead className="text-right">Valor Deduções</TableHead>
                       <TableHead className="text-right">Valor Líquido</TableHead>
                       <TableHead>Importado em</TableHead>
                       <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="text-xs font-mono">{bill.account_number || "—"}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{getLocal(bill)}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{bill.address || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {(bill.consumption_kwh || 0).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {(((bill as any).net_value || 0) + ((bill as any).deductions_value || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {((bill as any).lighting_cost || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono text-destructive">
                          {((bill as any).deductions_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono font-semibold">
                          {((bill as any).net_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(bill.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => setEditingBill(bill)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteBill(bill.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: CONTAS DE ÁGUA */}
        <TabsContent value="water" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard title="Consumo Total" value={`${waterTotalConsumption.toLocaleString("pt-BR")} m³`} icon={Droplets} variant="default" />
            <StatCard title="Valor Água" value={`R$ ${waterTotalWater.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="default" />
            <StatCard title="Valor Esgoto" value={`R$ ${waterTotalSewer.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={TrendingUp} variant="primary" />
            <StatCard title="Valor Total" value={`R$ ${waterTotalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="default" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={waterFilterProperty} onValueChange={setWaterFilterProperty}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Imóvel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os imóveis</SelectItem>
                {uniqueWaterProperties.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={waterFilterYear} onValueChange={setWaterFilterYear}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {uniqueWaterYears.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={waterFilterMonth} onValueChange={setWaterFilterMonth}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {uniqueWaterMonths.map((m) => (
                  <SelectItem key={m} value={m}>{monthNames[m] || m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden sm:flex flex-1" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={exportWaterExcel}>
                <Download className="w-4 h-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={exportWaterPDF}>
                <Download className="w-4 h-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={() => setWaterImportOpen(true)}>
                <Droplets className="w-4 h-4" /> Importar
              </Button>
            </div>
          </div>

          {waterBillsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredWaterBills.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Droplets className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma conta de água importada</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Importar Água" para começar</p>
                <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setWaterImportOpen(true)}>
                  <Droplets className="w-4 h-4" /> Importar Conta de Água
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referência</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead className="text-right">Consumo (m³)</TableHead>
                      <TableHead className="text-right">Valor Água</TableHead>
                      <TableHead className="text-right">Valor Esgoto</TableHead>
                       <TableHead className="text-right">Valor Total</TableHead>
                       <TableHead>Importado em</TableHead>
                       <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWaterBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="text-xs">{bill.reference_month || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{bill.account_number || "—"}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{getWaterLocal(bill)}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{bill.address || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {(bill.consumption_m3 || 0).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {(bill.water_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {(bill.sewer_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono font-semibold">
                          {(bill.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(bill.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => setEditingWaterBill(bill)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteWaterBill(bill.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* Bill Import Dialogs */}
      <BillImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          toast.success("Conta importada!");
          fetchBills();
        }}
      />

      <WaterBillImportDialog
        open={waterImportOpen}
        onOpenChange={setWaterImportOpen}
        onImported={() => {
          fetchWaterBills();
        }}
      />

      {/* Property Detail Dialog */}
      <Dialog open={!!selectedProperty} onOpenChange={(open) => !open && setSelectedProperty(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedProperty && (() => {
            const prop = properties.find((p) => p.id === selectedProperty);
            if (!prop) return null;
            const propBills = bills.filter((b) => getLocal(b) === selectedProperty);
            const propDeductions = propBills.reduce((s, b) => s + (b.deductions_value || 0), 0);
            const propNetValue = propBills.reduce((s, b) => s + (b.net_value || 0), 0);
            const propGrossValue = propNetValue + propDeductions;
            const balance = prop.generation - prop.consumption;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" /> {prop.name}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {prop.address} — <Plug className="w-3 h-3" /> {prop.utility}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Consumo</p>
                    <p className="text-sm font-bold font-mono">{(prop.consumption / 1000).toFixed(2)} MWh</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Geração</p>
                    <p className="text-sm font-bold font-mono text-primary">{(prop.generation / 1000).toFixed(2)} MWh</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Balanço</p>
                    <p className={`text-sm font-bold font-mono ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                      {balance >= 0 ? "+" : ""}{(balance / 1000).toFixed(2)} MWh
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Faturas</p>
                    <p className="text-sm font-bold font-mono">{prop.count}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Valor Bruto</p>
                    <p className="text-sm font-bold font-mono">R$ {propGrossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Deduções</p>
                    <p className="text-sm font-bold font-mono text-primary">R$ {propDeductions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Valor Líquido</p>
                    <p className="text-sm font-bold font-mono">R$ {propNetValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div className="mt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Histórico de Faturas</h4>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Referência</TableHead>
                          <TableHead className="text-xs text-right">Consumo (kWh)</TableHead>
                          <TableHead className="text-xs text-right">Valor Bruto</TableHead>
                          <TableHead className="text-xs text-right">Deduções</TableHead>
                          <TableHead className="text-xs text-right">Valor Líquido</TableHead>
                          <TableHead className="text-xs">Vencimento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {propBills.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="text-xs">{b.reference_month || "—"}</TableCell>
                            <TableCell className="text-xs text-right font-mono">{(b.consumption_kwh || 0).toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-xs text-right font-mono">R$ {((b.net_value || 0) + (b.deductions_value || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-xs text-right font-mono">R$ {(b.deductions_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-xs text-right font-mono">R$ {(b.net_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-xs">{b.due_date || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
