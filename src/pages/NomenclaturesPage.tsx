import { useState, useEffect } from "react";
import { Settings2, Pencil, Trash2, Save, X, Plus, Zap, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Nomenclature {
  id: string;
  account_number: string;
  location_name: string;
  plant_id: string | null;
}

interface WaterNomenclature {
  id: string;
  account_number: string;
  location_name: string;
}

interface Plant {
  id: string;
  name: string;
}

export default function NomenclaturesPage() {
  const [tab, setTab] = useState("energy");

  // Energy nomenclatures
  const [nomenclatures, setNomenclatures] = useState<Nomenclature[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [editingNom, setEditingNom] = useState<string | null>(null);
  const [editNomAccount, setEditNomAccount] = useState("");
  const [editNomLocation, setEditNomLocation] = useState("");
  const [editNomPlant, setEditNomPlant] = useState<string | null>(null);
  const [newNomAccount, setNewNomAccount] = useState("");
  const [newNomLocation, setNewNomLocation] = useState("");
  const [newNomPlant, setNewNomPlant] = useState<string | null>(null);

  // Water nomenclatures
  const [waterNomenclatures, setWaterNomenclatures] = useState<WaterNomenclature[]>([]);
  const [editingWater, setEditingWater] = useState<string | null>(null);
  const [editWaterAccount, setEditWaterAccount] = useState("");
  const [editWaterLocation, setEditWaterLocation] = useState("");
  const [newWaterAccount, setNewWaterAccount] = useState("");
  const [newWaterLocation, setNewWaterLocation] = useState("");

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("property_locations")
      .select("id, account_number, location_name, plant_id")
      .order("location_name");
    if (data) setNomenclatures(data as any);
  };

  const fetchPlants = async () => {
    const { data } = await supabase
      .from("plants")
      .select("id, name")
      .order("name");
    if (data) setPlants(data);
  };

  const fetchWaterLocations = async () => {
    const { data } = await supabase
      .from("water_property_locations" as any)
      .select("id, account_number, location_name")
      .order("location_name");
    if (data) setWaterNomenclatures(data as any);
  };

  useEffect(() => {
    fetchLocations();
    fetchPlants();
    fetchWaterLocations();
  }, []);

  const saveNomenclature = async (accountNumber: string, locationName: string, plantId: string | null, existingId?: string) => {
    if (!accountNumber.trim() || !locationName.trim()) { toast.error("Preencha código do cliente e local"); return; }
    const { data: profile } = await supabase.from("profiles").select("tenant_id").limit(1).single();
    if (!profile) { toast.error("Erro ao obter tenant"); return; }

    if (existingId) {
      const { error } = await supabase.from("property_locations").update({
        account_number: accountNumber.trim(),
        location_name: locationName.trim(),
        plant_id: plantId || null,
      } as any).eq("id", existingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Nomenclatura atualizada");
    } else {
      const { error } = await supabase.from("property_locations").insert({
        tenant_id: profile.tenant_id,
        account_number: accountNumber.trim(),
        location_name: locationName.trim(),
        plant_id: plantId || null,
      } as any);
      if (error) {
        if (error.code === "23505") toast.error("Este código de cliente já está cadastrado");
        else toast.error("Erro ao salvar");
        return;
      }
      toast.success("Nomenclatura adicionada");
    }
    setEditingNom(null);
    setNewNomAccount("");
    setNewNomLocation("");
    setNewNomPlant(null);
    fetchLocations();
  };

  const deleteNomenclature = async (id: string) => {
    const { error } = await supabase.from("property_locations").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Nomenclatura excluída");
    fetchLocations();
  };

  const saveWaterNomenclature = async (accountNumber: string, locationName: string, existingId?: string) => {
    if (!accountNumber.trim() || !locationName.trim()) { toast.error("Preencha código do cliente e local"); return; }
    const { data: profile } = await supabase.from("profiles").select("tenant_id").limit(1).single();
    if (!profile) { toast.error("Erro ao obter tenant"); return; }

    if (existingId) {
      const { error } = await supabase.from("water_property_locations" as any).update({
        account_number: accountNumber.trim(),
        location_name: locationName.trim(),
      } as any).eq("id", existingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Nomenclatura de água atualizada");
    } else {
      const { error } = await supabase.from("water_property_locations" as any).insert({
        tenant_id: profile.tenant_id,
        account_number: accountNumber.trim(),
        location_name: locationName.trim(),
      } as any);
      if (error) {
        if (error.code === "23505") toast.error("Este código de cliente já está cadastrado");
        else toast.error("Erro ao salvar");
        return;
      }
      toast.success("Nomenclatura de água adicionada");
    }
    setEditingWater(null);
    setNewWaterAccount("");
    setNewWaterLocation("");
    fetchWaterLocations();
  };

  const deleteWaterNomenclature = async (id: string) => {
    const { error } = await supabase.from("water_property_locations" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Nomenclatura de água excluída");
    fetchWaterLocations();
  };

  const getPlantName = (plantId: string | null) => {
    if (!plantId) return "—";
    return plants.find((p) => p.id === plantId)?.name || "—";
  };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="energy" className="gap-2">
          <Zap className="w-4 h-4" /> Energia
        </TabsTrigger>
        <TabsTrigger value="water" className="gap-2">
          <Droplets className="w-4 h-4" /> Água
        </TabsTrigger>
      </TabsList>

      {/* ENERGIA */}
      <TabsContent value="energy">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Mapeamento Código do Cliente → Local (Energia)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Associe cada código de cliente a um nome de local e a uma usina. Ao importar faturas de energia, o sistema usará esta tabela automaticamente.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código do Cliente</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Usina</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nomenclatures.map((nom) => (
                  <TableRow key={nom.id}>
                    {editingNom === nom.id ? (
                      <>
                        <TableCell>
                          <Input value={editNomAccount} onChange={(e) => setEditNomAccount(e.target.value)} className="h-8 text-xs" />
                        </TableCell>
                        <TableCell>
                          <Input value={editNomLocation} onChange={(e) => setEditNomLocation(e.target.value)} className="h-8 text-xs" />
                        </TableCell>
                        <TableCell>
                          <Select value={editNomPlant || "none"} onValueChange={(v) => setEditNomPlant(v === "none" ? null : v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhuma</SelectItem>
                              {plants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveNomenclature(editNomAccount, editNomLocation, editNomPlant, nom.id)}>
                              <Save className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNom(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-xs font-mono">{nom.account_number}</TableCell>
                        <TableCell className="text-sm font-medium">{nom.location_name}</TableCell>
                        <TableCell className="text-sm">{getPlantName(nom.plant_id)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingNom(nom.id); setEditNomAccount(nom.account_number); setEditNomLocation(nom.location_name); setEditNomPlant(nom.plant_id); }}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteNomenclature(nom.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    <Input placeholder="Código do cliente" value={newNomAccount} onChange={(e) => setNewNomAccount(e.target.value)} className="h-8 text-xs" />
                  </TableCell>
                  <TableCell>
                    <Input placeholder="Nome do local" value={newNomLocation} onChange={(e) => setNewNomLocation(e.target.value)} className="h-8 text-xs" />
                  </TableCell>
                  <TableCell>
                    <Select value={newNomPlant || "none"} onValueChange={(v) => setNewNomPlant(v === "none" ? null : v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione usina" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {plants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => saveNomenclature(newNomAccount, newNomLocation, newNomPlant)} disabled={!newNomAccount.trim() || !newNomLocation.trim()}>
                      <Plus className="w-3 h-3" /> Adicionar
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ÁGUA */}
      <TabsContent value="water">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Droplets className="w-4 h-4" /> Mapeamento Código do Cliente → Local (Água)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Associe cada código de cliente de água a um nome de local. Ao importar contas de água, o sistema usará esta tabela automaticamente.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código do Cliente</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waterNomenclatures.map((nom) => (
                  <TableRow key={nom.id}>
                    {editingWater === nom.id ? (
                      <>
                        <TableCell>
                          <Input value={editWaterAccount} onChange={(e) => setEditWaterAccount(e.target.value)} className="h-8 text-xs" />
                        </TableCell>
                        <TableCell>
                          <Input value={editWaterLocation} onChange={(e) => setEditWaterLocation(e.target.value)} className="h-8 text-xs" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveWaterNomenclature(editWaterAccount, editWaterLocation, nom.id)}>
                              <Save className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingWater(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-xs font-mono">{nom.account_number}</TableCell>
                        <TableCell className="text-sm font-medium">{nom.location_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingWater(nom.id); setEditWaterAccount(nom.account_number); setEditWaterLocation(nom.location_name); }}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteWaterNomenclature(nom.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    <Input placeholder="Código do cliente" value={newWaterAccount} onChange={(e) => setNewWaterAccount(e.target.value)} className="h-8 text-xs" />
                  </TableCell>
                  <TableCell>
                    <Input placeholder="Nome do local" value={newWaterLocation} onChange={(e) => setNewWaterLocation(e.target.value)} className="h-8 text-xs" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => saveWaterNomenclature(newWaterAccount, newWaterLocation)} disabled={!newWaterAccount.trim() || !newWaterLocation.trim()}>
                      <Plus className="w-3 h-3" /> Adicionar
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
