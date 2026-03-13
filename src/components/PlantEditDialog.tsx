import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PlantEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: {
    id: string;
    name: string;
    location: string | null;
    utility_company: string | null;
    integrator: string | null;
    latitude: number | null;
    longitude: number | null;
    capacity_kwp: number;
  };
  onSave: (data: {
    location: string;
    utility_company: string;
    integrator: string;
    latitude: number | null;
    longitude: number | null;
    capacity_kwp: number;
  }) => Promise<void>;
}

export function PlantEditDialog({ open, onOpenChange, plant, onSave }: PlantEditDialogProps) {
  const [location, setLocation] = useState(plant.location || "");
  const [utilityCompany, setUtilityCompany] = useState(plant.utility_company || "");
  const [integrator, setIntegrator] = useState(plant.integrator || "");
  const [capacityKwp, setCapacityKwp] = useState(plant.capacity_kwp);
  const [lat, setLat] = useState<number | null>(plant.latitude);
  const [lng, setLng] = useState<number | null>(plant.longitude);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocation(plant.location || "");
      setUtilityCompany(plant.utility_company || "");
      setIntegrator(plant.integrator || "");
      setCapacityKwp(plant.capacity_kwp);
      setLat(plant.latitude);
      setLng(plant.longitude);
    }
  }, [open, plant]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ location, utility_company: utilityCompany, integrator, capacity_kwp: capacityKwp, latitude: lat, longitude: lng });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar Usina — {plant.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="location">Localização / Endereço</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Rua das Flores, 123 - Garanhuns/PE"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="utility">Concessionária</Label>
            <Input
              id="utility"
              value={utilityCompany}
              onChange={(e) => setUtilityCompany(e.target.value)}
              placeholder="Ex: CELPE, Neoenergia, CEMIG"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="integrator">Integrador</Label>
            <Input
              id="integrator"
              value={integrator}
              onChange={(e) => setIntegrator(e.target.value)}
              placeholder="Ex: Solar Brasil, EcoEnergia"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacidade (kWp)</Label>
            <Input
              id="capacity"
              type="number"
              step="0.01"
              value={capacityKwp}
              onChange={(e) => setCapacityKwp(parseFloat(e.target.value) || 0)}
              placeholder="Ex: 75.6"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="0.000001"
                value={lat ?? ""}
                onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="-8.880000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="0.000001"
                value={lng ?? ""}
                onChange={(e) => setLng(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="-36.490000"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
