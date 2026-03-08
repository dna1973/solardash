import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Search, Zap, TrendingUp, DollarSign, BarChart3, MapPin, Plug, FileUp, FileText, Trash2, Receipt } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EnergyBill {
  id: string;
  property_name: string | null;
  address: string | null;
  utility_company: string | null;
  account_number: string | null;
  reference_month: string | null;
  consumption_kwh: number | null;
  generation_kwh: number | null;
  amount_brl: number | null;
  tariff_type: string | null;
  due_date: string | null;
  created_at: string;
}

export default function ConsumptionPage() {
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [mainTab, setMainTab] = useState("properties");

  // Bills state
  const [bills, setBills] = useState<EnergyBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billFilterMonth, setBillFilterMonth] = useState("all");
  const [billFilterUtility, setBillFilterUtility] = useState("all");

  const fetchBills = async () => {
    setBillsLoading(true);
    const { data, error } = await supabase
      .from("energy_bills")
      .select("id, property_name, address, utility_company, account_number, reference_month, consumption_kwh, generation_kwh, amount_brl, tariff_type, due_date, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bills:", error);
    } else {
      setBills(data || []);
    }
    setBillsLoading(false);
  };

  useEffect(() => {
    fetchBills();
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

  // Derive unique months and utilities from bills for filters
  const uniqueMonths = [...new Set(bills.map((b) => b.reference_month).filter(Boolean))] as string[];
  const uniqueUtilities = [...new Set(bills.map((b) => b.utility_company).filter(Boolean))] as string[];

  const filteredBills = bills.filter((b) => {
    const matchMonth = billFilterMonth === "all" || b.reference_month === billFilterMonth;
    const matchUtility = billFilterUtility === "all" || b.utility_company === billFilterUtility;
    return matchMonth && matchUtility;
  });

  const billsTotalConsumption = filteredBills.reduce((s, b) => s + (b.consumption_kwh || 0), 0);
  const billsTotalGeneration = filteredBills.reduce((s, b) => s + (b.generation_kwh || 0), 0);
  const billsTotalAmount = filteredBills.reduce((s, b) => s + (b.amount_brl || 0), 0);

  // Aggregate bills by property for the "Imóveis" tab
  const propertiesMap = new Map<string, { name: string; address: string; utility: string; consumption: number; generation: number; cost: number; count: number }>();
  bills.forEach((b) => {
    const key = b.property_name || b.account_number || "Sem identificação";
    const existing = propertiesMap.get(key);
    if (existing) {
      existing.consumption += b.consumption_kwh || 0;
      existing.generation += b.generation_kwh || 0;
      existing.cost += b.amount_brl || 0;
      existing.count++;
    } else {
      propertiesMap.set(key, {
        name: b.property_name || "Sem nome",
        address: b.address || "—",
        utility: b.utility_company || "—",
        consumption: b.consumption_kwh || 0,
        generation: b.generation_kwh || 0,
        cost: b.amount_brl || 0,
        count: 1,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consumo por Imóvel</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de consumo e geração de energia por unidade consumidora
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
            <FileUp className="w-4 h-4" /> Importar Conta (OCR)
          </Button>
        </div>
      </div>

      {/* Main Tabs: Imóveis vs Contas Importadas */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="bg-muted/60">
          <TabsTrigger value="properties" className="gap-2">
            <Building2 className="w-4 h-4" /> Imóveis
          </TabsTrigger>
          <TabsTrigger value="bills" className="gap-2">
            <Receipt className="w-4 h-4" /> Contas Importadas
            {bills.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{bills.length}</Badge>
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
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Consumo Total" value={`${(totalConsumption / 1000).toFixed(1)} MWh`} icon={Zap} variant="default" />
                <StatCard title="Geração Total" value={`${(totalGeneration / 1000).toFixed(1)} MWh`} icon={TrendingUp} variant="primary" />
                <StatCard title="Custo Total" value={`R$ ${totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="default" />
              </div>

              {/* Filters */}
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

              {/* Properties Grid */}
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
                      <Card className="shadow-card hover:shadow-card-hover transition-shadow border-border/50">
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
                            <Badge variant="outline" className="text-[10px]">{prop.count} conta{prop.count > 1 ? "s" : ""}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-muted/50 p-2.5">
                              <p className="text-[10px] text-muted-foreground">Consumo</p>
                              <p className="text-sm font-semibold font-mono">{(prop.consumption / 1000).toFixed(1)} MWh</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2.5">
                              <p className="text-[10px] text-muted-foreground">Geração</p>
                              <p className="text-sm font-semibold font-mono text-primary">{(prop.generation / 1000).toFixed(1)} MWh</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="text-muted-foreground">Custo: </span>
                              <span className="font-semibold">R$ {prop.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <span className={`font-semibold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                              {balance >= 0 ? "Excedente" : "Déficit"} ({balance > 0 ? "+" : ""}{(balance / 1000).toFixed(1)} MWh)
                            </span>
                          </div>
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

        {/* TAB: CONTAS IMPORTADAS */}
        <TabsContent value="bills" className="space-y-6 mt-4">
          {/* Bills Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Consumo Total" value={`${(billsTotalConsumption / 1000).toFixed(1)} MWh`} icon={Zap} variant="default" />
            <StatCard title="Geração Total" value={`${(billsTotalGeneration / 1000).toFixed(1)} MWh`} icon={TrendingUp} variant="primary" />
            <StatCard title="Valor Total" value={`R$ ${billsTotalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="default" />
          </div>

          {/* Bills Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={billFilterMonth} onValueChange={setBillFilterMonth}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Mês de referência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {uniqueMonths.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={billFilterUtility} onValueChange={setBillFilterUtility}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Concessionária" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas concessionárias</SelectItem>
                {uniqueUtilities.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
              <FileUp className="w-4 h-4" /> Importar Nova Conta
            </Button>
          </div>

          {/* Bills Table */}
          {billsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredBills.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma conta importada</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Importar Conta (OCR)" para começar</p>
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
                      <TableHead>Imóvel / Titular</TableHead>
                      <TableHead>UC</TableHead>
                      <TableHead>Concessionária</TableHead>
                      <TableHead>Mês Ref.</TableHead>
                      <TableHead className="text-right">Consumo (kWh)</TableHead>
                      <TableHead className="text-right">Geração (kWh)</TableHead>
                      <TableHead className="text-right">Valor (R$)</TableHead>
                      <TableHead>Tarifa</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[180px]">{bill.property_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{bill.address || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{bill.account_number || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{bill.utility_company || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{bill.reference_month || "—"}</TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {(bill.consumption_kwh || 0).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono text-primary">
                          {(bill.generation_kwh || 0).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono font-semibold">
                          {(bill.amount_brl || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs">{bill.tariff_type || "—"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteBill(bill.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Bill Import Dialog */}
      <BillImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          toast.success("Conta importada!");
          fetchBills();
        }}
      />
    </div>
  );
}
