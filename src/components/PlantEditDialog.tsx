import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Search } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { animate: true, duration: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);
  return null;
}

export function PlantEditDialog({ open, onOpenChange, plant, onSave }: PlantEditDialogProps) {
  const [location, setLocation] = useState(plant.location || "");
  const [utilityCompany, setUtilityCompany] = useState(plant.utility_company || "");
  const [integrator, setIntegrator] = useState(plant.integrator || "");
  const [lat, setLat] = useState<number | null>(plant.latitude);
  const [lng, setLng] = useState<number | null>(plant.longitude);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([plant.latitude || -8.88, plant.longitude || -36.49]);
  const [mapZoom, setMapZoom] = useState(plant.latitude ? 15 : 6);

  useEffect(() => {
    if (open) {
      setLocation(plant.location || "");
      setUtilityCompany(plant.utility_company || "");
      setIntegrator(plant.integrator || "");
      setLat(plant.latitude);
      setLng(plant.longitude);
      setMapCenter([plant.latitude || -8.88, plant.longitude || -36.49]);
      setMapZoom(plant.latitude ? 15 : 6);
    }
  }, [open, plant]);

  const handleMapClick = useCallback((newLat: number, newLng: number) => {
    setLat(parseFloat(newLat.toFixed(6)));
    setLng(parseFloat(newLng.toFixed(6)));
  }, []);

  const handleSearchAddress = async () => {
    if (!location.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
      );
      const results = await res.json();
      if (results.length > 0) {
        const newLat = parseFloat(parseFloat(results[0].lat).toFixed(6));
        const newLng = parseFloat(parseFloat(results[0].lon).toFixed(6));
        setLat(newLat);
        setLng(newLng);
        setMapCenter([newLat, newLng]);
        setMapZoom(15);
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ location, utility_company: utilityCompany, integrator, latitude: lat, longitude: lng });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usina — {plant.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Location with search */}
          <div className="space-y-1.5">
            <Label htmlFor="location">Localização / Endereço</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Rua das Flores, 123 - Garanhuns/PE"
                onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleSearchAddress}
                disabled={searching || !location.trim()}
                title="Buscar endereço no mapa"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
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
              Clique no mapa ou busque pelo endereço
            </Label>
            <div className="rounded-lg overflow-hidden border border-border h-[280px]">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapClickHandler onMapClick={handleMapClick} />
                <MapUpdater center={mapCenter} zoom={mapZoom} />
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
