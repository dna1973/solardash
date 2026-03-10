import { useState, useEffect } from "react";
import { Settings2, Pencil, Trash2, Save, X, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Nomenclature {
  id: string;
  account_number: string;
  location_name: string;
  plant_id: string | null;
  water_account_number: string | null;
}

interface Plant {
  id: string;
  name: string;
}

export default function NomenclaturesPage() {
  const [nomenclatures, setNomenclatures] = useState<Nomenclature[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [editingNom, setEditingNom] = useState<string | null>(null);
  const [editNomAccount, setEditNomAccount] = useState("");
  const [editNomLocation, setEditNomLocation] = useState("");
  const [editNomPlant, setEditNomPlant] = useState<string | null>(null);
  const [editNomWater, setEditNomWater] = useState("");
  const [newNomAccount, setNewNomAccount] = useState("");
  const [newNomLocation, setNewNomLocation] = useState("");
  const [newNomPlant, setNewNomPlant] = useState<string | null>(null);
  const [newNomWater, setNewNomWater] = useState("");

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("property_locations")
      .select("id, account_number, location_name, plant_id, water_account_number")
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

  useEffect(() => {
    fetchLocations();
    fetchPlants();
  }, []);

  const saveNomenclature = async (accountNumber: string, locationName: string, plantId: string | null, waterAccount: string, existingId?: string) => {
    if (!accountNumber.trim() || !locationName.trim()) { toast.error("Preencha código do cliente e local"); return; }
    const { data: profile } = await supabase.from("profiles").select("tenant_id").limit(1).single();
    if (!profile) { toast.error("Erro ao obter tenant"); return; }

    const payload = {
      account_number: accountNumber.trim(),
      location_name: locationName.trim(),
      plant_id: plantId || null,
      water_account_number: waterAccount.trim() || null,
    };

    if (existingId) {
      const { error } = await supabase.from("property_locations").update(payload as any).eq("id", existingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Localidade atualizada");
    } else {
      const { error } = await supabase.from("property_locations").insert({
        tenant_id: profile.tenant_id,
        ...payload,
      } as any);
      if (error) {
        if (error.code === "23505") toast.error("Este código de cliente já está cadastrado");
        else toast.error("Erro ao salvar");
        return;
      }
      toast.success("Localidade adicionada");
    }
    setEditingNom(null);
    setNewNomAccount(""); setNewNomLocation(""); setNewNomPlant(null); setNewNomWater("");
    fetchLocations();
  };

  const deleteNomenclature = async (id: string) => {
    const { error } = await supabase.from("property_locations").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Localidade excluída");
    fetchLocations();
  };

  const getPlantName = (plantId: string | null) => {
    if (!plantId) return "—";
    return plants.find((p) => p.id === plantId)?.name || "—";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Localidades
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Associe cada localidade ao código do cliente (energia), matrícula (água), nome do local e usina. O sistema usará esta tabela ao importar faturas.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cód. Cliente (Energia)</TableHead>
              <TableHead>Matrícula (Água)</TableHead>
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
                      <Input value={editNomWater} onChange={(e) => setEditNomWater(e.target.value)} className="h-8 text-xs" placeholder="Matrícula água" />
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveNomenclature(editNomAccount, editNomLocation, editNomPlant, editNomWater, nom.id)}>
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
                    <TableCell className="text-xs font-mono">{nom.water_account_number || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{nom.location_name}</TableCell>
                    <TableCell className="text-sm">{getPlantName(nom.plant_id)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditingNom(nom.id);
                          setEditNomAccount(nom.account_number);
                          setEditNomLocation(nom.location_name);
                          setEditNomPlant(nom.plant_id);
                          setEditNomWater(nom.water_account_number || "");
                        }}>
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
            {/* Add new row */}
            <TableRow>
              <TableCell>
                <Input placeholder="Código do cliente" value={newNomAccount} onChange={(e) => setNewNomAccount(e.target.value)} className="h-8 text-xs" />
              </TableCell>
              <TableCell>
                <Input placeholder="Matrícula água" value={newNomWater} onChange={(e) => setNewNomWater(e.target.value)} className="h-8 text-xs" />
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
                <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => saveNomenclature(newNomAccount, newNomLocation, newNomPlant, newNomWater)} disabled={!newNomAccount.trim() || !newNomLocation.trim()}>
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
