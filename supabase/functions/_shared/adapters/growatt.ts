// Growatt Adapter - connects to Growatt ShineServer (server.growatt.com)
// Uses the same web portal API that the browser uses
import type {
  AdapterCredentials,
  NormalizedPlant,
  NormalizedDevice,
  NormalizedEnergyData,
} from "../solar-types.ts";

const GROWATT_SERVERS: Record<string, string> = {
  global: "https://server.growatt.com",
  us: "https://server-us.growatt.com",
  openapi: "https://openapi.growatt.com",
};

interface GrowattSession {
  cookie: string;
  userId: string;
  baseUrl: string;
}

function normalizeUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (!u.startsWith("http")) u = `https://${u}`;
  return u;
}

async function safeJson(response: Response, context: string): Promise<any> {
  const text = await response.text();
  if (!response.ok && response.status !== 302) {
    throw new Error(`Growatt ${context}: HTTP ${response.status} - ${text.substring(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    // Some endpoints return HTML on success (redirect), check for JSON in response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    }
    throw new Error(`Growatt ${context}: resposta inesperada do servidor. Verifique suas credenciais.`);
  }
}

export async function authenticate(
  credentials: AdapterCredentials
): Promise<GrowattSession> {
  if (!credentials.username || !credentials.password) {
    throw new Error("Growatt: credenciais (usuário e senha) são obrigatórias");
  }

  const baseUrl = normalizeUrl(credentials.base_url || GROWATT_SERVERS.global);

  // Growatt ShineServer login endpoint
  const loginUrl = `${baseUrl}/login`;
  console.log(`Growatt: tentando login em ${loginUrl}`);

  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        account: credentials.username,
        password: credentials.password,
        validateCode: "",
        isReadPact: "0",
      }),
      redirect: "manual",
    });
  } catch (e) {
    throw new Error(`Growatt: não foi possível conectar a ${baseUrl}. Verifique a URL.`);
  }

  // Collect all cookies
  const cookies: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value.split(";")[0]);
    }
  });
  const cookieStr = cookies.join("; ") || response.headers.get("set-cookie")?.split(";")[0] || "";

  // Try to parse the login response
  let body: any = {};
  const text = await response.text();
  try {
    body = JSON.parse(text);
  } catch {
    // Check if we got redirected (success with cookie)
    if (!cookieStr) {
      throw new Error("Growatt: autenticação falhou. Verifique usuário e senha.");
    }
  }

  // Growatt returns { back: { success: true, ... } } or { result: 1 }
  const loginSuccess = body.back?.success === true || body.result === 1 || body.back?.userId;
  if (!loginSuccess && !cookieStr) {
    const errMsg = body.back?.msg || body.error || "credenciais inválidas";
    throw new Error(`Growatt: login falhou — ${errMsg}`);
  }

  console.log(`Growatt: login OK, userId=${body.back?.userId || "?"}, cookies=${cookieStr.length > 0 ? "yes" : "no"}`);

  return {
    cookie: cookieStr,
    userId: body.back?.userId || body.back?.user?.id || "",
    baseUrl,
  };
}

export async function listPlants(
  session: GrowattSession,
  _baseUrl?: string
): Promise<NormalizedPlant[]> {
  const baseUrl = session.baseUrl;

  // Try multiple endpoints - ShineServer vs OpenAPI differ
  const endpoints = [
    "/index/getPlantListTitle",
    "/panel/getDevicesByPlantList",
    "/index/getPlantListTitle_498",
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Growatt: tentando ${baseUrl}${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          Cookie: session.cookie,
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json, text/plain, */*",
        },
      });

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.log(`Growatt: ${endpoint} retornou HTML, tentando próximo...`);
        continue;
      }

      // Different response formats
      const plants = data.back || data.data || data.datas || data.result || [];
      const plantList = Array.isArray(plants) ? plants : (plants.plantList || plants.data || []);

      if (Array.isArray(plantList) && plantList.length > 0) {
        console.log(`Growatt: ${plantList.length} planta(s) encontrada(s) via ${endpoint}`);
        return plantList.map((p: any) => ({
          external_id: String(p.id || p.plantId),
          name: p.plantName || p.name || "Unknown",
          location: [p.city, p.country].filter(Boolean).join(", ") || "",
          latitude: p.lat ? parseFloat(p.lat) : undefined,
          longitude: p.lng ? parseFloat(p.lng) : undefined,
          capacity_kwp: p.nominalPower ? parseFloat(p.nominalPower) : undefined,
          status: mapPlantStatus(p.status),
        }));
      }

      console.log(`Growatt: ${endpoint} retornou lista vazia, tentando próximo...`);
    } catch (e) {
      console.log(`Growatt: erro em ${endpoint}: ${e}`);
      continue;
    }
  }

  // If all endpoints returned empty, try with userId
  if (session.userId) {
    try {
      const response = await fetch(`${baseUrl}/panel/getPlantList?userId=${session.userId}`, {
        headers: {
          Cookie: session.cookie,
          "User-Agent": "Mozilla/5.0",
        },
      });
      const data = await safeJson(response, "getPlantList");
      const plants = data.back?.data || data.datas || data.data || [];
      if (Array.isArray(plants) && plants.length > 0) {
        return plants.map((p: any) => ({
          external_id: String(p.id || p.plantId),
          name: p.plantName || p.name || "Unknown",
          location: [p.city, p.country].filter(Boolean).join(", ") || "",
          latitude: p.lat ? parseFloat(p.lat) : undefined,
          longitude: p.lng ? parseFloat(p.lng) : undefined,
          capacity_kwp: p.nominalPower ? parseFloat(p.nominalPower) : undefined,
          status: mapPlantStatus(p.status),
        }));
      }
    } catch (e) {
      console.log(`Growatt: getPlantList with userId failed: ${e}`);
    }
  }

  return [];
}

export async function listDevices(
  session: GrowattSession,
  plantId: string,
  _baseUrl?: string
): Promise<NormalizedDevice[]> {
  const baseUrl = session.baseUrl;
  const response = await fetch(
    `${baseUrl}/panel/getDevicesByPlant?plantId=${plantId}`,
    {
      headers: {
        Cookie: session.cookie,
        "User-Agent": "Mozilla/5.0",
      },
    }
  );
  const data = await safeJson(response, "listDevices");
  const devices = data.back?.deviceList || data.obj?.datas || data.data || [];

  return (Array.isArray(devices) ? devices : []).map((d: any) => ({
    external_id: d.deviceSn || d.sn || d.serialNum || d.alias,
    plant_external_id: plantId,
    manufacturer: "Growatt",
    model: d.deviceModel || d.deviceType || d.model || "Unknown",
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
  _baseUrl?: string
): Promise<NormalizedEnergyData[]> {
  const baseUrl = session.baseUrl;
  const response = await fetch(
    `${baseUrl}/panel/getPlantData?plantId=${plantId}`,
    {
      headers: {
        Cookie: session.cookie,
        "User-Agent": "Mozilla/5.0",
      },
    }
  );
  const data = await safeJson(response, "collectEnergy");
  const plantData = data.back || data.obj || data.data || {};

  const now = new Date().toISOString();

  return [
    {
      plant_external_id: plantId,
      device_external_id: _deviceSerial,
      timestamp: now,
      generation_power_kw: parseFloat(plantData.currentPower || plantData.nominalPower || "0") / 1000,
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
