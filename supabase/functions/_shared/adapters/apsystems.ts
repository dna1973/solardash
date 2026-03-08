// APsystems EMA OpenAPI Adapter
// Docs: https://file.apsystemsema.com:8083/apsystems/resource/openapi/Apsystems_OpenAPI_User_Manual_Installer_EN.pdf
// Base URL: https://api.apsystemsema.com:9282

import type { AdapterCredentials, NormalizedPlant, NormalizedDevice, NormalizedEnergyData } from "../solar-types.ts";

const BASE_URL = "https://api.apsystemsema.com:9282";

interface APSystemsSession {
  token: string;
  baseUrl: string;
}

export async function authenticate(credentials: AdapterCredentials): Promise<APSystemsSession> {
  const baseUrl = credentials.base_url || BASE_URL;
  const appId = credentials.api_key;
  const appSecret = credentials.token;

  if (!appId || !appSecret) {
    throw new Error("APsystems requer App ID e App Secret da OpenAPI");
  }

  // The APsystems OpenAPI uses appId + appSecret for authentication
  // The token is constructed as Bearer authorization
  // Some versions use direct appId/appSecret in headers
  console.log("apsystems: autenticando com appId:", appId?.substring(0, 4) + "...");

  return {
    token: `${appId}:${appSecret}`,
    baseUrl,
  };
}

async function apiRequest(session: APSystemsSession, endpoint: string, body?: any, method = "POST"): Promise<any> {
  const [appId, appSecret] = session.token.split(":");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "appId": appId,
    "appSecret": appSecret,
  };

  const options: RequestInit = { method, headers };
  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  const url = `${session.baseUrl}${endpoint}`;
  console.log(`apsystems: ${method} ${url}`);

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const text = await response.text();
    console.error(`apsystems: HTTP ${response.status} — ${text}`);
    throw new Error(`APsystems API erro ${response.status}: ${text.substring(0, 200)}`);
  }

  const data = await response.json();
  console.log(`apsystems: resposta:`, JSON.stringify(data).substring(0, 500));

  if (data.code && data.code !== "0" && data.code !== 0) {
    throw new Error(`APsystems API erro: ${data.message || data.msg || JSON.stringify(data)}`);
  }

  return data;
}

export async function listPlants(session: APSystemsSession): Promise<NormalizedPlant[]> {
  // POST /installer/api/v2/systems
  const data = await apiRequest(session, "/installer/api/v2/systems", {
    page: 1,
    size: 100,
  });

  const systems = data.data?.systems || data.systems || data.data || [];
  
  if (!Array.isArray(systems)) {
    console.log("apsystems: resposta inesperada para listPlants:", JSON.stringify(data).substring(0, 500));
    return [];
  }

  return systems.map((s: any) => ({
    external_id: String(s.sid || s.systemId || s.system_id || ""),
    name: s.name || s.systemName || s.system_name || "APsystems System",
    location: s.address || s.location || undefined,
    latitude: s.latitude ? parseFloat(s.latitude) : undefined,
    longitude: s.longitude ? parseFloat(s.longitude) : undefined,
    capacity_kwp: s.capacity ? parseFloat(s.capacity) / 1000 : undefined, // W to kWp
    status: mapStatus(s.status),
  }));
}

export async function listDevices(session: APSystemsSession, plantId: string): Promise<NormalizedDevice[]> {
  // GET /installer/api/v2/systems/inverters/{sid}
  const data = await apiRequest(session, `/installer/api/v2/systems/inverters/${plantId}`, undefined, "GET");

  const inverters = data.data?.inverters || data.inverters || data.data || [];

  if (!Array.isArray(inverters)) {
    return [];
  }

  return inverters.map((inv: any) => ({
    external_id: String(inv.uid || inv.inverterId || inv.inverter_id || ""),
    plant_external_id: plantId,
    manufacturer: "apsystems",
    model: inv.model || inv.type || "APsystems Microinverter",
    serial_number: inv.uid || inv.sn || inv.serialNumber || "",
    device_type: "inverter" as const,
    status: mapDeviceStatus(inv.status),
    last_communication: inv.lastReportTime || inv.last_report_time || undefined,
  }));
}

export async function collectEnergy(session: APSystemsSession, plantId: string, _deviceSerial?: string): Promise<NormalizedEnergyData[]> {
  // POST /installer/api/v2/systems/energy/{sid}/today
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  
  let data: any;
  try {
    data = await apiRequest(session, `/installer/api/v2/systems/energy/${plantId}/today`, {
      date: today,
    });
  } catch {
    // Fallback: try system-level data
    try {
      data = await apiRequest(session, `/installer/api/v2/systems/${plantId}/summary`, undefined, "GET");
    } catch (e2) {
      console.error("apsystems: falha ao coletar energia:", e2);
      return [];
    }
  }

  const entries = data.data?.energy || data.energy || [];
  
  if (Array.isArray(entries) && entries.length > 0) {
    return entries.map((e: any) => ({
      plant_external_id: plantId,
      timestamp: e.timestamp || e.time || new Date().toISOString(),
      generation_power_kw: e.power ? parseFloat(e.power) / 1000 : undefined, // W to kW
      energy_generated_kwh: e.energy ? parseFloat(e.energy) : undefined,
      consumption_power_kw: undefined,
      energy_consumed_kwh: undefined,
      status: "ok",
    }));
  }

  // If we got summary data instead
  if (data.data) {
    const summary = data.data;
    return [{
      plant_external_id: plantId,
      timestamp: new Date().toISOString(),
      generation_power_kw: summary.currentPower ? parseFloat(summary.currentPower) / 1000 : 0,
      energy_generated_kwh: summary.todayEnergy ? parseFloat(summary.todayEnergy) : 0,
      consumption_power_kw: undefined,
      energy_consumed_kwh: undefined,
      status: "ok",
    }];
  }

  return [];
}

function mapStatus(status: any): "online" | "offline" | "warning" | "maintenance" {
  const s = String(status).toLowerCase();
  if (s === "normal" || s === "1" || s === "online" || s === "running") return "online";
  if (s === "warning" || s === "2" || s === "alarm") return "warning";
  return "offline";
}

function mapDeviceStatus(status: any): "online" | "offline" | "warning" {
  const s = String(status).toLowerCase();
  if (s === "normal" || s === "1" || s === "online" || s === "running") return "online";
  if (s === "warning" || s === "2" || s === "alarm") return "warning";
  return "offline";
}
