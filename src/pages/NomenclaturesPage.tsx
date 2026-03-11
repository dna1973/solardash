import { useState, useEffect } from "react";
import { Settings2, Pencil, Trash2, Save, X, Plus, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

interface Nomenclature {
  id: string;
  account_number: string;
  location_name: string;
  plant_ids: string[];
  water_account_number: string | null;
}

interface Plant {
  id: string;
  name: string;
}

function PlantMultiSelect({
  plants,
  selectedIds,
  onChange,
  usedPlantIds = [],
}: {
  plants: Plant[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  usedPlantIds?: string[];
}) {
  // Show plants that are either selected by this row or not used by others
  const availablePlants = plants.filter(
    (p) => selectedIds.includes(p.id) || !usedPlantIds.includes(p.id)
  );
  const selectedNames = plants
    .filter((p) => selectedIds.includes(p.id))
    .map((p) => p.name);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 text-xs justify-start w-full font-normal">
          {selectedNames.length === 0
            ? "Selecione usina(s)"
            : selectedNames.length <= 2
            ? selectedNames.join(", ")
            : `${selectedNames.length} usinas`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 max-h-60 overflow-auto" align="start">
        {availablePlants.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
          >
            <Checkbox
              checked={selectedIds.includes(p.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...selectedIds, p.id]);
                } else {
                  onChange(selectedIds.filter((id) => id !== p.id));
                }
              }}
            />
            {p.name}
          </label>
        ))}
        {plants.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-1">Nenhuma usina cadastrada</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function NomenclaturesPage() {
  const [nomenclatures, setNomenclatures] = useState<Nomenclature[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [editingNom, setEditingNom] = useState<string | null>(null);
  const [editNomAccount, setEditNomAccount] = useState("");
  const [editNomLocation, setEditNomLocation] = useState("");
  const [editNomPlants, setEditNomPlants] = useState<string[]>([]);
  const [editNomWater, setEditNomWater] = useState("");
  const [newNomAccount, setNewNomAccount] = useState("");
  const [newNomLocation, setNewNomLocation] = useState("");
  const [newNomPlants, setNewNomPlants] = useState<string[]>([]);
  const [newNomWater, setNewNomWater] = useState("");

  const fetchLocations = async () => {
    // Fetch locations
    const { data: locData } = await supabase
      .from("property_locations")
      .select("id, account_number, location_name, water_account_number")
      .order("location_name");

    // Fetch junction data
    const { data: junctionData } = await supabase
      .from("property_location_plants" as any)
      .select("location_id, plant_id");

    const junctions = (junctionData || []) as any[];

    if (locData) {
      const noms: Nomenclature[] = locData.map((loc: any) => ({
        id: loc.id,
        account_number: loc.account_number,
        location_name: loc.location_name,
        water_account_number: loc.water_account_number,
        plant_ids: junctions
          .filter((j) => j.location_id === loc.id)
          .map((j) => j.plant_id),
      }));
      setNomenclatures(noms);
    }
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

  const saveNomenclature = async (
    accountNumber: string,
    locationName: string,
    plantIds: string[],
    waterAccount: string,
    existingId?: string
  ) => {
    if (!accountNumber.trim() || !locationName.trim()) {
      toast.error("Preencha código do cliente e local");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .limit(1)
      .single();
    if (!profile) {
      toast.error("Erro ao obter tenant");
      return;
    }

    const payload = {
      account_number: accountNumber.trim(),
      location_name: locationName.trim(),
      water_account_number: waterAccount.trim() || null,
    };

    let locationId = existingId;

    if (existingId) {
      const { error } = await supabase
        .from("property_locations")
        .update(payload as any)
        .eq("id", existingId);
      if (error) {
        toast.error("Erro ao atualizar");
        return;
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("property_locations")
        .insert({
          tenant_id: profile.tenant_id,
          ...payload,
        } as any)
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505")
          toast.error("Este código de cliente já está cadastrado");
        else toast.error("Erro ao salvar");
        return;
      }
      locationId = (inserted as any).id;
    }

    // Sync junction table
    if (locationId) {
      // Delete existing
      await supabase
        .from("property_location_plants" as any)
        .delete()
        .eq("location_id", locationId);

      // Insert new
      if (plantIds.length > 0) {
        const rows = plantIds.map((pid) => ({
          location_id: locationId,
          plant_id: pid,
        }));
        await supabase
          .from("property_location_plants" as any)
          .insert(rows as any);
      }
    }

    toast.success(existingId ? "Localidade atualizada" : "Localidade adicionada");
    setEditingNom(null);
    setNewNomAccount("");
    setNewNomLocation("");
    setNewNomPlants([]);
    setNewNomWater("");
    fetchLocations();
  };

  const deleteNomenclature = async (id: string) => {
    const { error } = await supabase
      .from("property_locations")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Localidade excluída");
    fetchLocations();
  };

  const getPlantNames = (plantIds: string[]) => {
    if (plantIds.length === 0) return null;
    return plants.filter((p) => plantIds.includes(p.id));
  };

  // All plant IDs already used across all locations
  const allUsedPlantIds = nomenclatures.flatMap((n) => n.plant_ids);

  // For editing: exclude plant IDs used by OTHER rows (not the one being edited)
  const getUsedPlantIdsExcluding = (excludeId?: string) => {
    return nomenclatures
      .filter((n) => n.id !== excludeId)
      .flatMap((n) => n.plant_ids);
  };

  const getExportData = () => {
    return nomenclatures.map((nom) => {
      const plantNames = plants
        .filter((p) => nom.plant_ids.includes(p.id))
        .map((p) => p.name)
        .join(", ");
      return {
        "Cód. Cliente (Energia)": nom.account_number,
        "Matrícula (Água)": nom.water_account_number || "—",
        "Local": nom.location_name,
        "Usina(s)": plantNames || "—",
      };
    });
  };

  const handleExportExcel = () => {
    const data = getExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Localidades");
    XLSX.writeFile(wb, "localidades.xlsx");
    toast.success("Excel exportado");
  };

  const handleExportPDF = () => {
    const data = getExportData();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Localidades", 14, 18);
    doc.setFontSize(9);

    const headers = ["Cód. Cliente (Energia)", "Matrícula (Água)", "Local", "Usina(s)"];
    const colWidths = [55, 45, 80, 90];
    let y = 28;

    // Header row
    doc.setFont("helvetica", "bold");
    let x = 14;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    y += 6;
    doc.setFont("helvetica", "normal");

    data.forEach((row) => {
      if (y > 190) {
        doc.addPage();
        y = 18;
      }
      x = 14;
      Object.values(row).forEach((val, i) => {
        doc.text(String(val).substring(0, 45), x, y);
        x += colWidths[i];
      });
      y += 6;
    });

    doc.save("localidades.pdf");
    toast.success("PDF exportado");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Localidades
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Associe cada localidade ao código do cliente (energia), matrícula
              (água), nome do local e usina(s). O sistema usará esta tabela ao
              importar faturas.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileDown className="w-4 h-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>Exportar Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Exportar PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cód. Cliente (Energia)</TableHead>
              <TableHead>Matrícula (Água)</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Usina(s)</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nomenclatures.map((nom) => (
              <TableRow key={nom.id}>
                {editingNom === nom.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={editNomAccount}
                        onChange={(e) => setEditNomAccount(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editNomWater}
                        onChange={(e) => setEditNomWater(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="Matrícula água"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editNomLocation}
                        onChange={(e) => setEditNomLocation(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <PlantMultiSelect
                        plants={plants}
                        selectedIds={editNomPlants}
                        onChange={setEditNomPlants}
                        usedPlantIds={getUsedPlantIdsExcluding(nom.id)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            saveNomenclature(
                              editNomAccount,
                              editNomLocation,
                              editNomPlants,
                              editNomWater,
                              nom.id
                            )
                          }
                        >
                          <Save className="w-3.5 h-3.5 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingNom(null)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-xs font-mono">
                      {nom.account_number}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {nom.water_account_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {nom.location_name}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const matched = getPlantNames(nom.plant_ids);
                        if (!matched || matched.length === 0) return <span className="text-sm text-muted-foreground">—</span>;
                        return (
                          <div className="flex flex-wrap gap-1">
                            {matched.map((p) => (
                              <Badge key={p.id} variant="secondary" className="text-xs">
                                {p.name}
                              </Badge>
                            ))}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingNom(nom.id);
                            setEditNomAccount(nom.account_number);
                            setEditNomLocation(nom.location_name);
                            setEditNomPlants(nom.plant_ids);
                            setEditNomWater(nom.water_account_number || "");
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNomenclature(nom.id)}
                        >
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
                <Input
                  placeholder="Código do cliente"
                  value={newNomAccount}
                  onChange={(e) => setNewNomAccount(e.target.value)}
                  className="h-8 text-xs"
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Matrícula água"
                  value={newNomWater}
                  onChange={(e) => setNewNomWater(e.target.value)}
                  className="h-8 text-xs"
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Nome do local"
                  value={newNomLocation}
                  onChange={(e) => setNewNomLocation(e.target.value)}
                  className="h-8 text-xs"
                />
              </TableCell>
              <TableCell>
                <PlantMultiSelect
                  plants={plants}
                  selectedIds={newNomPlants}
                  onChange={setNewNomPlants}
                  usedPlantIds={allUsedPlantIds}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() =>
                    saveNomenclature(
                      newNomAccount,
                      newNomLocation,
                      newNomPlants,
                      newNomWater
                    )
                  }
                  disabled={!newNomAccount.trim() || !newNomLocation.trim()}
                >
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
