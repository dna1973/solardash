// APsystems EMA OpenAPI Adapter (End User)
// Docs: Apsystems_OpenAPI_User_Manual_End_User_EN.pdf
// Base URL: https://api.apsystemsema.com:9282
// Auth: Signature-based (HMAC-SHA256)
// stringToSign = Timestamp + "/" + Nonce + "/" + AppId + "/" + RequestPath + "/" + HTTPMethod + "/" + SignatureMethod

import type { AdapterCredentials, NormalizedPlant, NormalizedDevice, NormalizedEnergyData } from "../solar-types.ts";

const BASE_URL = "https://api.apsystemsema.com:9282";

interface APSystemsSession {
  appId: string;
  appSecret: string;
  baseUrl: string;
  systemId?: string; // sid - required for End User API
}

export async function authenticate(credentials: AdapterCredentials): Promise<APSystemsSession> {
  const appId = (credentials.api_key || "").trim();
  const appSecret = (credentials.token || "").trim();
  const baseUrl = (credentials.base_url || BASE_URL).trim();
  const systemId = (credentials.system_id || credentials.plant_id || "").trim() || undefined;

  if (!appId || !appSecret) {
    throw new Error("APsystems requer App ID e App Secret da OpenAPI");
  }

  console.log("apsystems: autenticando com appId:", appId.substring(0, 4) + "..., appSecret length:", appSecret.length);
  return { appId, appSecret, baseUrl, systemId };
}

// Generate HMAC-SHA256 signature per APsystems docs (Section 2.2.2)
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

async function apiRequest(session: APSystemsSession, endpoint: string, queryParams?: Record<string, string>, method = "GET"): Promise<any> {
  const timestamp = String(Date.now());
  const nonce = generateNonce();
  const signatureMethod = "HmacSHA256";

  // APsystems docs Section 2.2.2:
  // stringToSign = X-CA-Timestamp + "/" + X-CA-Nonce + "/" + X-CA-AppId + "/" + RequestPath + "/" + HTTPMethod + "/" + X-CA-Signature-Method
  // "RequestPath" = "The last segment of the path" (NOT the full path)
  const pathParts = endpoint.split("/").filter(Boolean);
  const requestPath = pathParts[pathParts.length - 1] || endpoint;
  const stringToSign = `${timestamp}/${nonce}/${session.appId}/${requestPath}/${method}/${signatureMethod}`;
  console.log(`apsystems: stringToSign: ${stringToSign}`);

  const signature = await generateSignature(session.appSecret, stringToSign);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-CA-AppId": session.appId,
    "X-CA-Timestamp": timestamp,
    "X-CA-Nonce": nonce,
    "X-CA-Signature-Method": signatureMethod,
    "X-CA-Signature": signature,
  };

  // Build URL with query params for GET requests
  let url = `${session.baseUrl}${endpoint}`;
  if (queryParams && Object.keys(queryParams).length > 0) {
    const qs = new URLSearchParams(queryParams).toString();
    url += `?${qs}`;
  }

  console.log(`apsystems: ${method} ${url}`);
  console.log(`apsystems: headers:`, JSON.stringify({
    "X-CA-AppId": session.appId.substring(0, 4) + "...",
    "X-CA-Timestamp": timestamp,
    "X-CA-Nonce": nonce,
    "X-CA-Signature-Method": signatureMethod,
    "X-CA-Signature": signature.substring(0, 10) + "...",
  }));

  const response = await fetch(url, { method, headers });
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

// End User API: GET /user/api/v2/systems/details/{sid}
export async function listPlants(session: APSystemsSession): Promise<NormalizedPlant[]> {
  if (!session.systemId) {
    throw new Error("APsystems End User API requer o System ID (sid). Configure-o nas credenciais da integração.");
  }

  // End User API doesn't have a list-all endpoint; fetch details for the configured system
  const data = await apiRequest(session, `/user/api/v2/systems/details/${session.systemId}`);

  const sys = data.data;
  if (!sys) {
    console.log("apsystems: sem dados para o sistema:", session.systemId);
    return [];
  }

  return [{
    external_id: sys.sid || session.systemId,
    name: sys.sid || `APsystems ${session.systemId}`,
    location: undefined,
    latitude: undefined,
    longitude: undefined,
    capacity_kwp: sys.capacity ? parseFloat(sys.capacity) : undefined,
    status: mapStatus(sys.light),
  }];
}

// End User API: GET /user/api/v2/systems/inverters/{sid}
export async function listDevices(session: APSystemsSession, plantId: string): Promise<NormalizedDevice[]> {
  const data = await apiRequest(session, `/user/api/v2/systems/inverters/${plantId}`);

  const ecus = data.data || [];
  const devices: NormalizedDevice[] = [];

  if (Array.isArray(ecus)) {
    for (const ecu of ecus) {
      const inverters = ecu.inverter || [];
      for (const inv of inverters) {
        devices.push({
          external_id: String(inv.uid || ""),
          plant_external_id: plantId,
          manufacturer: "apsystems",
          model: inv.type || "APsystems Microinverter",
          serial_number: inv.uid || "",
          device_type: "inverter" as const,
          status: "online" as const,
          last_communication: undefined,
        });
      }
    }
  }

  return devices;
}

// End User API: GET /user/api/v2/systems/energy/{sid}?energy_level=hourly&date_range=yyyy-MM-dd
export async function collectEnergy(session: APSystemsSession, plantId: string, _deviceSerial?: string): Promise<NormalizedEnergyData[]> {
  const today = new Date().toISOString().split("T")[0]; // yyyy-MM-dd

  // Try hourly energy for today first
  try {
    const data = await apiRequest(
      session,
      `/user/api/v2/systems/energy/${plantId}`,
      { energy_level: "hourly", date_range: today }
    );

    const entries = data.data;
    if (Array.isArray(entries) && entries.length > 0) {
      return entries.map((val: string, idx: number) => ({
        plant_external_id: plantId,
        timestamp: `${today}T${String(idx).padStart(2, "0")}:00:00Z`,
        generation_power_kw: undefined,
        energy_generated_kwh: val ? parseFloat(val) : 0,
        consumption_power_kw: undefined,
        energy_consumed_kwh: undefined,
        status: "ok",
      })).filter(e => e.energy_generated_kwh > 0);
    }
  } catch (e) {
    console.log("apsystems: falha ao buscar energia horária, tentando sumário:", e);
  }

  // Fallback: summary endpoint
  try {
    const data = await apiRequest(session, `/user/api/v2/systems/summary/${plantId}`);
    const summary = data.data;
    if (summary) {
      return [{
        plant_external_id: plantId,
        timestamp: new Date().toISOString(),
        generation_power_kw: 0,
        energy_generated_kwh: summary.today ? parseFloat(summary.today) : 0,
        consumption_power_kw: undefined,
        energy_consumed_kwh: undefined,
        status: "ok",
      }];
    }
  } catch (e2) {
    console.error("apsystems: falha ao coletar sumário:", e2);
  }

  return [];
}

// APsystems light status: 1=Green(normal), 2=Yellow(warning), 3=Red(error), 4=Grey(no data)
function mapStatus(light: any): "online" | "offline" | "warning" | "maintenance" {
  const l = Number(light);
  if (l === 1) return "online";
  if (l === 2) return "warning";
  if (l === 3) return "offline";
  return "offline";
}

function mapDeviceStatus(status: any): "online" | "offline" | "warning" {
  const s = String(status).toLowerCase();
  if (s === "normal" || s === "1" || s === "online") return "online";
  if (s === "warning" || s === "2") return "warning";
  return "offline";
}
