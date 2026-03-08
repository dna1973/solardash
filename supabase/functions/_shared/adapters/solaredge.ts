// SolarEdge Adapter - connects to SolarEdge Monitoring API
// Docs: https://monitoring.solaredge.com/solaredge-web/p/login
// API Key obtained from SolarEdge monitoring portal (free)
import type {
  AdapterCredentials,
  NormalizedPlant,
  NormalizedDevice,
  NormalizedEnergyData,
} from "../solar-types.ts";

const SOLAREDGE_BASE = "https://monitoringapi.solaredge.com";

export function getApiKey(credentials: AdapterCredentials): string {
  const key = credentials.api_key || credentials.token || "";
  if (!key) throw new Error("SolarEdge API Key is required");
  return key;
}

export async function listPlants(
  credentials: AdapterCredentials
): Promise<NormalizedPlant[]> {
  const apiKey = getApiKey(credentials);
  const response = await fetch(`${SOLAREDGE_BASE}/sites/list?api_key=${apiKey}`);
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SolarEdge API error [${response.status}]: ${text}`);
  }

  const data = await response.json();
  const sites = data.sites?.site || [];

  return sites.map((s: any) => ({
    external_id: String(s.id),
    name: s.name || "Unknown",
    location: [s.location?.city, s.location?.state, s.location?.country]
      .filter(Boolean)
      .join(", "),
    latitude: s.location?.latitude,
    longitude: s.location?.longitude,
    capacity_kwp: s.peakPower || undefined,
    status: mapStatus(s.status),
  }));
}

export async function listDevices(
  credentials: AdapterCredentials,
  siteId: string
): Promise<NormalizedDevice[]> {
  const apiKey = getApiKey(credentials);
  const response = await fetch(
    `${SOLAREDGE_BASE}/equipment/${siteId}/list?api_key=${apiKey}`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SolarEdge API error [${response.status}]: ${text}`);
  }

  const data = await response.json();
  const reporters = data.reporters?.list || [];

  return reporters.map((r: any) => ({
    external_id: r.serialNumber,
    plant_external_id: siteId,
    manufacturer: "SolarEdge",
    model: r.model || r.name || "Unknown",
    serial_number: r.serialNumber,
    device_type: mapDeviceType(r.name),
    status: "online" as const,
    last_communication: undefined,
  }));
}

export async function collectEnergy(
  credentials: AdapterCredentials,
  siteId: string,
  deviceSerial?: string
): Promise<NormalizedEnergyData[]> {
  const apiKey = getApiKey(credentials);
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Get current power flow
  const overviewResp = await fetch(
    `${SOLAREDGE_BASE}/site/${siteId}/overview?api_key=${apiKey}`
  );
  
  if (!overviewResp.ok) {
    const text = await overviewResp.text();
    throw new Error(`SolarEdge API error [${overviewResp.status}]: ${text}`);
  }

  const overview = await overviewResp.json();
  const ov = overview.overview || {};

  // Get energy details for today
  const energyResp = await fetch(
    `${SOLAREDGE_BASE}/site/${siteId}/energy?timeUnit=QUARTER_OF_AN_HOUR&startDate=${today}&endDate=${today}&api_key=${apiKey}`
  );

  let energyValues: any[] = [];
  if (energyResp.ok) {
    const energyData = await energyResp.json();
    energyValues = energyData.energy?.values || [];
  } else {
    await energyResp.text(); // consume body
  }

  const results: NormalizedEnergyData[] = [];

  // Current overview point
  results.push({
    plant_external_id: siteId,
    device_external_id: deviceSerial,
    timestamp: now.toISOString(),
    generation_power_kw: (ov.currentPower?.power || 0) / 1000,
    energy_generated_kwh: ov.lastDayData?.energy
      ? ov.lastDayData.energy / 1000
      : undefined,
    status: "ok",
  });

  // Historical 15-min intervals
  for (const val of energyValues) {
    if (val.value != null && val.value > 0) {
      results.push({
        plant_external_id: siteId,
        device_external_id: deviceSerial,
        timestamp: val.date,
        energy_generated_kwh: val.value / 1000,
        status: "ok",
      });
    }
  }

  return results;
}

function mapStatus(status: string): NormalizedPlant["status"] {
  const s = status?.toLowerCase();
  if (s === "active") return "online";
  if (s === "warning") return "warning";
  return "offline";
}

function mapDeviceType(name: string): NormalizedDevice["device_type"] {
  const n = (name || "").toLowerCase();
  if (n.includes("inverter")) return "inverter";
  if (n.includes("meter")) return "meter";
  if (n.includes("logger") || n.includes("gateway")) return "datalogger";
  if (n.includes("sensor")) return "sensor";
  return "inverter";
}
