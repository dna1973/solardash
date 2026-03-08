import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const STATUS_COLORS: Record<string, string> = {
  online: "hsl(152, 60%, 42%)",
  offline: "hsl(0, 72%, 51%)",
  warning: "hsl(45, 100%, 50%)",
  maintenance: "hsl(210, 80%, 55%)",
};

function createColorIcon(status: string) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.offline;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="7" fill="white" opacity="0.9"/>
    <circle cx="14" cy="14" r="4" fill="${color}"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

interface Plant {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline" | "warning" | "maintenance";
  capacity_kwp: number;
  latitude: number | null;
  longitude: number | null;
}

interface PlantsMapProps {
  plants: Plant[];
  onPlantClick?: (id: string) => void;
}

export function PlantsMap({ plants, onPlantClick }: PlantsMapProps) {
  const plantsWithCoords = plants.filter((p) => p.latitude != null && p.longitude != null);

  // Default: center of Pernambuco
  const center = useMemo<[number, number]>(() => {
    if (plantsWithCoords.length === 0) return [-8.05, -34.87]; // Recife, PE
    const avgLat = plantsWithCoords.reduce((s, p) => s + p.latitude!, 0) / plantsWithCoords.length;
    const avgLng = plantsWithCoords.reduce((s, p) => s + p.longitude!, 0) / plantsWithCoords.length;
    return [avgLat, avgLng];
  }, [plantsWithCoords]);

  const zoom = plantsWithCoords.length === 0 ? 7 : plantsWithCoords.length === 1 ? 13 : 9;

  if (plantsWithCoords.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        <p>Nenhuma usina com coordenadas cadastradas.</p>
      </div>
    );
  }

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%", borderRadius: "0.75rem" }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | CARTO'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      {plantsWithCoords.map((plant) => (
        <Marker key={plant.id} position={[plant.latitude!, plant.longitude!]} icon={createColorIcon(plant.status)}>
          <Popup>
            <div className="text-xs space-y-1 min-w-[140px]">
              <p className="font-bold text-sm">{plant.name}</p>
              <p className="text-muted-foreground">{plant.location}</p>
              <p>
                <span className="font-medium">Status:</span>{" "}
                <span
                  style={{ color: STATUS_COLORS[plant.status] }}
                  className="font-semibold capitalize"
                >
                  {plant.status}
                </span>
              </p>
              <p><span className="font-medium">Capacidade:</span> {plant.capacity_kwp} kWp</p>
              {onPlantClick && (
                <button
                  onClick={() => onPlantClick(plant.id)}
                  className="mt-1 text-xs text-primary underline font-medium"
                >
                  Ver detalhes →
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
