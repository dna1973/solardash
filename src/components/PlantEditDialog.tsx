import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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
  };
  onSave: (data: {
    location: string;
    utility_company: string;
    integrator: string;
    latitude: number | null;
    longitude: number | null;
  }) => Promise<void>;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function PlantEditDialog({ open, onOpenChange, plant, onSave }: PlantEditDialogProps) {
  const [location, setLocation] = useState(plant.location || "");
  const [utilityCompany, setUtilityCompany] = useState(plant.utility_company || "");
  const [integrator, setIntegrator] = useState(plant.integrator || "");
  const [lat, setLat] = useState<number | null>(plant.latitude);
  const [lng, setLng] = useState<number | null>(plant.longitude);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocation(plant.location || "");
      setUtilityCompany(plant.utility_company || "");
      setIntegrator(plant.integrator || "");
      setLat(plant.latitude);
      setLng(plant.longitude);
    }
  }, [open, plant]);

  const handleMapClick = useCallback((newLat: number, newLng: number) => {
    setLat(parseFloat(newLat.toFixed(6)));
    setLng(parseFloat(newLng.toFixed(6)));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ location, utility_company: utilityCompany, integrator, latitude: lat, longitude: lng });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const center: [number, number] = [lat || -8.88, lng || -36.49];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usina — {plant.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location">Localização / Endereço</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Rua das Flores, 123 - Garanhuns/PE"
            />
          </div>

          {/* Utility Company */}
          <div className="space-y-1.5">
            <Label htmlFor="utility">Concessionária</Label>
            <Input
              id="utility"
              value={utilityCompany}
              onChange={(e) => setUtilityCompany(e.target.value)}
              placeholder="Ex: CELPE, Neoenergia, CEMIG"
            />
          </div>

          {/* Integrator */}
          <div className="space-y-1.5">
            <Label htmlFor="integrator">Integrador</Label>
            <Input
              id="integrator"
              value={integrator}
              onChange={(e) => setIntegrator(e.target.value)}
              placeholder="Ex: Solar Brasil, EcoEnergia"
            />
          </div>

          {/* Lat/Lng manual inputs */}
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

          {/* Map */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Clique no mapa para selecionar a localização
            </Label>
            <div className="rounded-lg overflow-hidden border border-border h-[280px]">
              <MapContainer
                center={center}
                zoom={lat ? 15 : 6}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapClickHandler onMapClick={handleMapClick} />
                {lat !== null && lng !== null && <Marker position={[lat, lng]} />}
              </MapContainer>
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
