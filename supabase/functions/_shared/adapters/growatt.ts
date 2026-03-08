// Growatt Adapter - connects to Growatt OpenAPI
import type {
  AdapterCredentials,
  NormalizedPlant,
  NormalizedDevice,
  NormalizedEnergyData,
} from "../solar-types.ts";

const GROWATT_SERVERS: Record<string, string> = {
  global: "https://openapi.growatt.com",
  china: "https://openapi-cn.growatt.com",
  australia: "https://openapi-au.growatt.com",
};

interface GrowattSession {
  cookie: string;
  userId: string;
}

async function safeJson(response: Response, context: string): Promise<any> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Growatt ${context}: HTTP ${response.status} - ${text.substring(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Growatt ${context}: resposta não é JSON (${text.substring(0, 100)}...)`);
  }
}

export async function authenticate(
  credentials: AdapterCredentials
): Promise<GrowattSession> {
  if (!credentials.username || !credentials.password) {
    throw new Error("Growatt: credenciais (usuário e senha) são obrigatórias");
  }

  const baseUrl = credentials.base_url || GROWATT_SERVERS.global;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        account: credentials.username,
        password: credentials.password,
      }),
      redirect: "manual",
    });
  } catch (e) {
    throw new Error(`Growatt: não foi possível conectar ao servidor (${baseUrl}). Verifique a URL.`);
  }

  const cookies = response.headers.get("set-cookie") || "";
  
  // Try to parse response - login may return HTML on some servers
  let body: any = {};
  const text = await response.text();
  try {
    body = JSON.parse(text);
  } catch {
    // If login returns HTML, cookies might still be valid
    if (!cookies) {
      throw new Error("Growatt: autenticação falhou. Verifique usuário, senha e URL do servidor.");
    }
  }

  const success = body.back?.success || body.result === 1 || !!cookies;
  if (!success) {
    throw new Error("Growatt: credenciais inválidas. Verifique usuário e senha no portal Growatt.");
  }

  return {
    cookie: cookies,
    userId: body.back?.userId || body.back?.user?.id || "",
  };
}

export async function listPlants(
  session: GrowattSession,
  baseUrl = GROWATT_SERVERS.global
): Promise<NormalizedPlant[]> {
  const response = await fetch(`${baseUrl}/index/getPlantListTitle`, {
    headers: { Cookie: session.cookie },
  });
  const data = await safeJson(response, "listPlants");
  const plants = data.back || [];

  return plants.map((p: any) => ({
    external_id: String(p.id || p.plantId),
    name: p.plantName || p.name || "Unknown",
    location: p.city || p.country || "",
    latitude: p.lat ? parseFloat(p.lat) : undefined,
    longitude: p.lng ? parseFloat(p.lng) : undefined,
    capacity_kwp: p.nominalPower ? parseFloat(p.nominalPower) : undefined,
    status: mapPlantStatus(p.status),
  }));
}

export async function listDevices(
  session: GrowattSession,
  plantId: string,
  baseUrl = GROWATT_SERVERS.global
): Promise<NormalizedDevice[]> {
  const response = await fetch(
    `${baseUrl}/v1/device/list?plant_id=${plantId}`,
    { headers: { Cookie: session.cookie } }
  );
  const data = await safeJson(response, "listDevices");
  const devices = data.back?.deviceList || data.data || [];

  return devices.map((d: any) => ({
    external_id: d.deviceSn || d.sn || d.serialNum,
    plant_external_id: plantId,
    manufacturer: "Growatt",
    model: d.deviceModel || d.model || "Unknown",
    serial_number: d.deviceSn || d.sn || d.serialNum,
    device_type: mapDeviceType(d.deviceType),
    status: mapDeviceStatus(d.status || d.lost),
    last_communication: d.lastUpdateTime || undefined,
  }));
}

export async function collectEnergy(
  session: GrowattSession,
  plantId: string,
  _deviceSerial?: string,
  baseUrl = GROWATT_SERVERS.global
): Promise<NormalizedEnergyData[]> {
  const response = await fetch(
    `${baseUrl}/v1/plant/data?plant_id=${plantId}`,
    { headers: { Cookie: session.cookie } }
  );
  const data = await safeJson(response, "collectEnergy");
  const plantData = data.back || data.data || {};

  const now = new Date().toISOString();

  return [
    {
      plant_external_id: plantId,
      device_external_id: _deviceSerial,
      timestamp: now,
      generation_power_kw: parseFloat(plantData.currentPower || "0") / 1000,
      energy_generated_kwh: parseFloat(plantData.todayEnergy || plantData.eToday || "0"),
      energy_consumed_kwh: parseFloat(plantData.todayConsumption || "0"),
      consumption_power_kw: parseFloat(plantData.consumptionPower || "0") / 1000,
      status: "ok",
    },
  ];
}

function mapPlantStatus(status: any): NormalizedPlant["status"] {
  const s = String(status).toLowerCase();
  if (s === "1" || s === "online" || s === "normal") return "online";
  if (s === "2" || s === "alarm" || s === "warning") return "warning";
  return "offline";
}

function mapDeviceType(type: any): NormalizedDevice["device_type"] {
  const t = String(type).toLowerCase();
  if (t.includes("inverter") || t === "inv" || t === "1") return "inverter";
  if (t.includes("meter") || t === "3") return "meter";
  if (t.includes("datalog") || t === "datalogger") return "datalogger";
  if (t.includes("gateway")) return "gateway";
  return "inverter";
}

function mapDeviceStatus(status: any): NormalizedDevice["status"] {
  const s = String(status).toLowerCase();
  if (s === "1" || s === "true" || s === "online" || s === "normal") return "online";
  if (s === "2" || s === "warning" || s === "alarm") return "warning";
  return "offline";
}
