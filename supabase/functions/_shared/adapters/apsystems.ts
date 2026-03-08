// APsystems EMA OpenAPI Adapter
// Docs: Apsystems_OpenAPI_User_Manual_Installer_EN.pdf
// Base URL: https://api.apsystemsema.com:9282
// Auth: Signature-based (X-CA-AppId, X-CA-Timestamp, X-CA-Nonce, X-CA-Signature-Method, X-CA-Signature)
// stringToSign = Timestamp + "/" + Nonce + "/" + AppId + "/" + RequestPath

import type { AdapterCredentials, NormalizedPlant, NormalizedDevice, NormalizedEnergyData } from "../solar-types.ts";

const BASE_URL = "https://api.apsystemsema.com:9282";

interface APSystemsSession {
  appId: string;
  appSecret: string;
  baseUrl: string;
}

export async function authenticate(credentials: AdapterCredentials): Promise<APSystemsSession> {
  const appId = credentials.api_key;
  const appSecret = credentials.token;
  const baseUrl = credentials.base_url || BASE_URL;

  if (!appId || !appSecret) {
    throw new Error("APsystems requer App ID e App Secret da OpenAPI");
  }

  console.log("apsystems: autenticando com appId:", appId.substring(0, 4) + "...");
  return { appId, appSecret, baseUrl };
}

// Generate HMAC-SHA256 signature per APsystems docs
async function generateSignature(appSecret: string, stringToSign: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(appSecret);
  const msgData = encoder.encode(stringToSign);

  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

async function apiRequest(session: APSystemsSession, endpoint: string, body?: any, method = "POST"): Promise<any> {
  const timestamp = String(Date.now());
  const nonce = generateNonce();

  // APsystems signature format from docs:
  // stringToSign = Timestamp + "/" + Nonce + "/" + AppId + "/" + RequestPath
  // RequestPath is the last segment or the full endpoint path
  const stringToSign = `${timestamp}/${nonce}/${session.appId}/${endpoint}`;
  console.log(`apsystems: stringToSign: ${stringToSign}`);

  const signature = await generateSignature(session.appSecret, stringToSign);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-CA-AppId": session.appId,
    "X-CA-Timestamp": timestamp,
    "X-CA-Nonce": nonce,
    "X-CA-Signature-Method": "HmacSHA256",
    "X-CA-Signature": signature,
  };

  const options: RequestInit = { method, headers };
  if (body && method === "POST") {
    options.body = JSON.stringify(body);
  }

  const url = `${session.baseUrl}${endpoint}`;
  console.log(`apsystems: ${method} ${url}`);
  console.log(`apsystems: headers:`, JSON.stringify({ 
    "X-CA-AppId": session.appId.substring(0, 4) + "...",
    "X-CA-Timestamp": timestamp,
    "X-CA-Nonce": nonce,
    "X-CA-Signature-Method": "HmacSHA256",
    "X-CA-Signature": signature.substring(0, 10) + "...",
  }));

  const response = await fetch(url, options);
  const text = await response.text();

  console.log(`apsystems: HTTP ${response.status}, body: ${text.substring(0, 500)}`);

  if (!response.ok) {
    throw new Error(`APsystems API erro HTTP ${response.status}: ${text.substring(0, 200)}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`APsystems retornou resposta não-JSON: ${text.substring(0, 100)}`);
  }

  // APsystems uses "code": 0 for success
  if (data.code !== undefined && data.code !== 0 && data.code !== "0") {
    const msg = data.message || data.msg || `code ${data.code}`;
    throw new Error(`APsystems API erro: ${msg}`);
  }

  return data;
}

export async function listPlants(session: APSystemsSession): Promise<NormalizedPlant[]> {
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
    capacity_kwp: s.capacity ? parseFloat(s.capacity) / 1000 : undefined,
    status: mapStatus(s.status),
  }));
}

export async function listDevices(session: APSystemsSession, plantId: string): Promise<NormalizedDevice[]> {
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
  const today = new Date().toISOString().split("T")[0];

  let data: any;
  try {
    data = await apiRequest(session, `/installer/api/v2/systems/energy/${plantId}/today`, {
      date: today,
    });
  } catch {
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
      generation_power_kw: e.power ? parseFloat(e.power) / 1000 : undefined,
      energy_generated_kwh: e.energy ? parseFloat(e.energy) : undefined,
      consumption_power_kw: undefined,
      energy_consumed_kwh: undefined,
      status: "ok",
    }));
  }

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
