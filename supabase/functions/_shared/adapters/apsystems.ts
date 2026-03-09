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
  const signatureMethod = "HmacSHA256";
  const pathParts = endpoint.split("/").filter(Boolean);
  const requestPath = pathParts[pathParts.length - 1] || endpoint;

  let url = `${session.baseUrl}${endpoint}`;
  if (queryParams && Object.keys(queryParams).length > 0) {
    const qs = new URLSearchParams(queryParams).toString();
    url += `?${qs}`;
  }

  const MAX_RETRIES = 3;
  const RATE_LIMIT_CODES = [2005, 7001, 7002, 7003];
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
      console.log(`apsystems: retry ${attempt}/${MAX_RETRIES} após ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }

    // Generate fresh auth headers for each attempt
    const timestamp = String(Date.now());
    const nonce = generateNonce();
    const stringToSign = `${timestamp}/${nonce}/${session.appId}/${requestPath}/${method}/${signatureMethod}`;
    const signature = await generateSignature(session.appSecret, stringToSign);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-CA-AppId": session.appId,
      "X-CA-Timestamp": timestamp,
      "X-CA-Nonce": nonce,
      "X-CA-Signature-Method": signatureMethod,
      "X-CA-Signature": signature,
    };

    if (attempt === 0) {
      console.log(`apsystems: ${method} ${url}`);
      console.log(`apsystems: headers:`, JSON.stringify({
        "X-CA-AppId": session.appId.substring(0, 4) + "...",
        "X-CA-Timestamp": timestamp,
        "X-CA-Nonce": nonce,
        "X-CA-Signature-Method": signatureMethod,
        "X-CA-Signature": signature.substring(0, 10) + "...",
      }));
    }

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

    if (data.code !== undefined && data.code !== 0 && data.code !== "0") {
      const code = Number(data.code);
      const errorMessages: Record<number, string> = {
        1000: "Exceção de dados",
        1001: "Sem dados disponíveis",
        2000: "Exceção na conta da aplicação",
        2001: "Conta de aplicação inválida",
        2002: "Conta de aplicação não autorizada",
        2003: "Autorização da conta expirou",
        2004: "Conta sem permissão para este recurso",
        2005: "Limite de acessos da conta excedido (rate limit)",
        3000: "Exceção no token de acesso",
        4000: "Exceção nos parâmetros da requisição",
        4001: "Parâmetro de requisição inválido",
        5000: "Erro interno do servidor APsystems",
        7001: "Limite de acesso ao servidor excedido",
        7002: "Muitas requisições — tente novamente mais tarde",
        7003: "Servidor ocupado — tente novamente mais tarde",
      };
      const friendlyMsg = errorMessages[code] || data.message || data.msg || `código ${code}`;
      const isRateLimit = RATE_LIMIT_CODES.includes(code);
      
      if (isRateLimit) {
        console.warn(`apsystems: RATE LIMIT atingido (code ${code}), attempt ${attempt}/${MAX_RETRIES}`);
        if (attempt < MAX_RETRIES) continue;
      }
      
      throw new Error(`APsystems API erro (code ${code}): ${friendlyMsg}`);
    }

    return data;
  }

  throw new Error("APsystems: máximo de tentativas excedido");
}

// End User API: GET /user/api/v2/systems/details/{sid}
// Each ECU is mapped as a separate plant since they're at different physical locations
export async function listPlants(session: APSystemsSession): Promise<NormalizedPlant[]> {
  if (!session.systemId) {
    throw new Error("APsystems End User API requer o System ID (sid). Configure-o nas credenciais da integração.");
  }

  const data = await apiRequest(session, `/user/api/v2/systems/details/${session.systemId}`);

  const sys = data.data;
  if (!sys) {
    console.log("apsystems: sem dados para o sistema:", session.systemId);
    return [];
  }

  const ecus: string[] = sys.ecu || [];
  const totalCapacity = sys.capacity ? parseFloat(sys.capacity) : 0;
  const capacityPerEcu = ecus.length > 0 ? totalCapacity / ecus.length : totalCapacity;

  if (ecus.length === 0) {
    // Fallback: single plant if no ECU list
    return [{
      external_id: sys.sid || session.systemId,
      name: `APsystems ${session.systemId}`,
      capacity_kwp: totalCapacity,
      status: mapStatus(sys.light),
    }];
  }

  // Also fetch inverters to get per-ECU details (with delay to avoid rate limit)
  let ecuInverterMap: Record<string, any[]> = {};
  try {
    await new Promise(r => setTimeout(r, 1500)); // Rate limit protection
    const invData = await apiRequest(session, `/user/api/v2/systems/inverters/${session.systemId}`);
    const ecuList = invData.data || [];
    if (Array.isArray(ecuList)) {
      for (const ecu of ecuList) {
        const ecuId = ecu.ecu_id || ecu.uid || "";
        if (ecuId) {
          ecuInverterMap[ecuId] = ecu.inverter || [];
        }
      }
    }
  } catch (e) {
    console.log("apsystems: não conseguiu buscar inversores para detalhar ECUs:", e);
  }

  console.log(`apsystems: ${ecus.length} ECUs encontradas, mapeando como plantas separadas`);

  return ecus.map((ecuId, idx) => {
    const inverters = ecuInverterMap[ecuId] || [];
    const ecuCapacity = inverters.length > 0
      ? inverters.reduce((sum: number, inv: any) => sum + (inv.max_power ? parseFloat(inv.max_power) / 1000 : capacityPerEcu / ecus.length), 0)
      : capacityPerEcu;

    return {
      external_id: `${session.systemId}_ECU_${ecuId}`,
      name: `ECU ${ecuId}`,
      capacity_kwp: Math.round(ecuCapacity * 100) / 100,
      status: mapStatus(sys.light),
    };
  });
}

// End User API: GET /user/api/v2/systems/inverters/{sid}
// Filters inverters belonging to the specific ECU (plant)
export async function listDevices(session: APSystemsSession, plantId: string): Promise<NormalizedDevice[]> {
  // plantId format: {sid}_ECU_{ecuId} or just {sid}
  const ecuId = extractEcuId(plantId);
  const sid = extractSid(session, plantId);

  const data = await apiRequest(session, `/user/api/v2/systems/inverters/${sid}`);

  const ecus = data.data || [];
  const devices: NormalizedDevice[] = [];

  if (Array.isArray(ecus)) {
    for (const ecu of ecus) {
      const thisEcuId = ecu.ecu_id || ecu.uid || "";
      
      // If we have an ECU filter, only include matching ECU's inverters
      if (ecuId && thisEcuId && thisEcuId !== ecuId) continue;

      // Add the ECU itself as a gateway device
      if (thisEcuId) {
        devices.push({
          external_id: thisEcuId,
          plant_external_id: plantId,
          manufacturer: "apsystems",
          model: "APsystems ECU",
          serial_number: thisEcuId,
          device_type: "gateway" as const,
          status: "online" as const,
          last_communication: undefined,
        });
      }

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

// Helper: extract ECU ID from plant external_id format "{sid}_ECU_{ecuId}"
function extractEcuId(plantId: string): string | null {
  const match = plantId.match(/_ECU_(.+)$/);
  return match ? match[1] : null;
}

// Helper: extract system ID from plant external_id
function extractSid(session: APSystemsSession, plantId: string): string {
  const match = plantId.match(/^(.+?)_ECU_/);
  return match ? match[1] : (session.systemId || plantId);
}

// Cache ECU count to avoid repeated API calls during a single sync
let _cachedEcuCount: number | null = null;

async function getEcuCount(session: APSystemsSession, sid: string): Promise<number> {
  if (_cachedEcuCount !== null) return _cachedEcuCount;
  try {
    const data = await apiRequest(session, `/user/api/v2/systems/details/${sid}`);
    const ecus = data.data?.ecu || [];
    _cachedEcuCount = ecus.length || 1;
  } catch {
    _cachedEcuCount = 1;
  }
  return _cachedEcuCount;
}

// Energy API only works at system (sid) level. For ECU-based plants we divide proportionally.
export async function collectEnergy(session: APSystemsSession, plantId: string, _deviceSerial?: string): Promise<NormalizedEnergyData[]> {
  const today = new Date().toISOString().split("T")[0];
  const sid = extractSid(session, plantId);
  const isEcuPlant = extractEcuId(plantId) !== null;
  const divisor = isEcuPlant ? await getEcuCount(session, sid) : 1;

  // Try hourly energy for today
  try {
    const data = await apiRequest(
      session,
      `/user/api/v2/systems/energy/${sid}`,
      { energy_level: "hourly", date_range: today }
    );

    const entries = data.data;
    if (Array.isArray(entries) && entries.length > 0) {
      return entries.map((val: string, idx: number) => ({
        plant_external_id: plantId,
        timestamp: `${today}T${String(idx).padStart(2, "0")}:00:00Z`,
        energy_generated_kwh: val ? parseFloat(val) / divisor : 0,
        status: "ok",
      })).filter(e => (e.energy_generated_kwh ?? 0) > 0);
    }
  } catch (e) {
    console.log("apsystems: falha ao buscar energia horária, tentando sumário:", e);
  }

  // Fallback: summary
  try {
    const data = await apiRequest(session, `/user/api/v2/systems/summary/${sid}`);
    const summary = data.data;
    const todayValue = summary?.today ? parseFloat(summary.today) / divisor : 0;
    if (summary && todayValue > 0) {
      return [{
        plant_external_id: plantId,
        timestamp: new Date().toISOString(),
        energy_generated_kwh: todayValue,
        status: "ok",
      }];
    }
  } catch (e2) {
    console.error("apsystems: falha ao coletar sumário:", e2);
  }

  return [];
}

// Collect daily energy for a date range
export async function collectDailyEnergy(
  session: APSystemsSession,
  plantId: string,
  startDate: string,
  endDate: string
): Promise<NormalizedEnergyData[]> {
  const sid = extractSid(session, plantId);
  const isEcuPlant = extractEcuId(plantId) !== null;
  const divisor = isEcuPlant ? await getEcuCount(session, sid) : 1;

  console.log(`apsystems: coletando energia diária de ${startDate} a ${endDate} (divisor=${divisor})`);
  
  const data = await apiRequest(
    session,
    `/user/api/v2/systems/energy/${sid}`,
    { energy_level: "daily", date_range: `${startDate},${endDate}` }
  );

  const entries = data.data;
  if (!entries || typeof entries !== "object") return [];

  const results: NormalizedEnergyData[] = [];

  if (Array.isArray(entries)) {
    const start = new Date(startDate);
    entries.forEach((val: string, idx: number) => {
      const date = new Date(start);
      date.setDate(date.getDate() + idx);
      const kwh = val ? parseFloat(val) / divisor : 0;
      if (kwh > 0) {
        results.push({
          plant_external_id: plantId,
          timestamp: `${date.toISOString().split("T")[0]}T12:00:00Z`,
          energy_generated_kwh: Math.round(kwh * 100) / 100,
          status: "ok",
        });
      }
    });
  } else {
    for (const [dateStr, val] of Object.entries(entries)) {
      const kwh = val ? parseFloat(String(val)) / divisor : 0;
      if (kwh > 0) {
        results.push({
          plant_external_id: plantId,
          timestamp: `${dateStr}T12:00:00Z`,
          energy_generated_kwh: Math.round(kwh * 100) / 100,
          status: "ok",
        });
      }
    }
  }

  console.log(`apsystems: ${results.length} dias com dados de energia`);
  return results;
}

// Collect monthly energy for a date range
export async function collectMonthlyEnergy(
  session: APSystemsSession,
  plantId: string,
  startMonth: string,
  endMonth: string
): Promise<NormalizedEnergyData[]> {
  const sid = extractSid(session, plantId);
  const isEcuPlant = extractEcuId(plantId) !== null;
  const divisor = isEcuPlant ? await getEcuCount(session, sid) : 1;

  console.log(`apsystems: coletando energia mensal de ${startMonth} a ${endMonth} (divisor=${divisor})`);

  const data = await apiRequest(
    session,
    `/user/api/v2/systems/energy/${sid}`,
    { energy_level: "monthly", date_range: `${startMonth},${endMonth}` }
  );

  const entries = data.data;
  if (!entries || typeof entries !== "object") return [];

  const results: NormalizedEnergyData[] = [];

  if (Array.isArray(entries)) {
    const [startYear, startMon] = startMonth.split("-").map(Number);
    entries.forEach((val: string, idx: number) => {
      const month = startMon + idx;
      const year = startYear + Math.floor((month - 1) / 12);
      const m = ((month - 1) % 12) + 1;
      const kwh = val ? parseFloat(val) / divisor : 0;
      if (kwh > 0) {
        results.push({
          plant_external_id: plantId,
          timestamp: `${year}-${String(m).padStart(2, "0")}-15T12:00:00Z`,
          energy_generated_kwh: Math.round(kwh * 100) / 100,
          status: "ok",
        });
      }
    });
  } else {
    for (const [monthStr, val] of Object.entries(entries)) {
      const kwh = val ? parseFloat(String(val)) / divisor : 0;
      if (kwh > 0) {
        results.push({
          plant_external_id: plantId,
          timestamp: `${monthStr}-15T12:00:00Z`,
          energy_generated_kwh: Math.round(kwh * 100) / 100,
          status: "ok",
        });
      }
    }
  }

  console.log(`apsystems: ${results.length} meses com dados de energia`);
  return results;
}

// APsystems light status: 1=Green(normal), 2=Yellow(warning), 3=Red(error), 4=Grey(no data)
function mapStatus(light: any): "online" | "offline" | "warning" | "maintenance" {
  const l = Number(light);
  if (l === 1) return "online";
  if (l === 2) return "warning";
  if (l === 3) return "offline";
  return "offline";
}
