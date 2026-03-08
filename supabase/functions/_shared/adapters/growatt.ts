// Growatt Adapter — based on indykoning/PyPi_GrowattServer patterns
// Uses .do endpoints (newTwoLoginAPI.do, PlantListAPI.do, etc.)
import type {
  AdapterCredentials,
  NormalizedPlant,
  NormalizedDevice,
  NormalizedEnergyData,
} from "../solar-types.ts";

interface GrowattSession {
  cookie: string;
  userId: string;
  baseUrl: string;
}

/** Growatt-specific password hash: MD5 hex with '0' nibble → 'c' at even positions */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  let hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Replace '0' at even positions with 'c' (Growatt quirk)
  const chars = hex.split("");
  for (let i = 0; i < chars.length; i += 2) {
    if (chars[i] === "0") chars[i] = "c";
  }
  return chars.join("");
}

function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!u.startsWith("http")) u = `https://${u}`;
  try {
    return new URL(u).origin;
  } catch {
    return u.replace(/\/+$/, "");
  }
}

const AGENT =
  "Dalvik/2.1.0 (Linux; U; Android 12; SolarDash/1.0)";

export async function authenticate(
  credentials: AdapterCredentials
): Promise<GrowattSession> {
  if (!credentials.username || !credentials.password) {
    throw new Error("Growatt: credenciais (usuário e senha) são obrigatórias");
  }

  const baseUrl = normalizeUrl(credentials.base_url || "https://openapi.growatt.com");
  const hashedPwd = await hashPassword(credentials.password);

  // Primary login endpoint used by the Python library
  const loginUrl = `${baseUrl}/newTwoLoginAPI.do`;
  console.log(`Growatt: login em ${loginUrl}`);

  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": AGENT,
      },
      body: new URLSearchParams({
        userName: credentials.username,
        password: hashedPwd,
      }),
      redirect: "manual",
    });
  } catch (e) {
    throw new Error(`Growatt: não foi possível conectar a ${baseUrl}. Verifique a URL. (${e})`);
  }

  // Collect cookies
  const cookies: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value.split(";")[0]);
    }
  });
  const cookieStr = cookies.join("; ") || "";

  const text = await response.text();
  console.log(`Growatt: login response (${text.length} chars): ${text.substring(0, 500)}`);

  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    // If we got a redirect/HTML but have cookies, try legacy endpoint
    if (cookieStr) {
      console.log("Growatt: newTwoLoginAPI retornou HTML mas temos cookies, tentando login legado...");
      return authenticateLegacy(credentials, baseUrl, cookieStr);
    }
    throw new Error("Growatt: resposta de login não é JSON. Verifique a URL do servidor.");
  }

  const back = body.back || body;
  if (!back.success) {
    throw new Error(`Growatt: login falhou — ${back.msg || back.error || "credenciais inválidas"}`);
  }

  const userId = String(back.user?.id || back.userId || "");
  console.log(`Growatt: login OK, userId=${userId}, cookies=${cookieStr ? "yes" : "no"}`);

  return { cookie: cookieStr, userId, baseUrl };
}

/** Fallback: legacy /login endpoint */
async function authenticateLegacy(
  credentials: AdapterCredentials,
  baseUrl: string,
  existingCookies: string
): Promise<GrowattSession> {
  const loginUrl = `${baseUrl}/login`;
  console.log(`Growatt: tentando login legado em ${loginUrl}`);

  const response = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": AGENT,
      Cookie: existingCookies,
    },
    body: new URLSearchParams({
      account: credentials.username!,
      password: credentials.password!,
      validateCode: "",
      isReadPact: "0",
    }),
    redirect: "manual",
  });

  const cookies: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value.split(";")[0]);
    }
  });
  const cookieStr = [existingCookies, ...cookies].filter(Boolean).join("; ");

  const text = await response.text();
  let body: any = {};
  try {
    body = JSON.parse(text);
  } catch {
    // HTML redirect = success if we have cookies
  }

  const userId = String(body.back?.userId || body.back?.user?.id || "");
  console.log(`Growatt: login legado, userId=${userId}, cookies=${cookieStr ? "yes" : "no"}`);

  return { cookie: cookieStr, userId, baseUrl };
}

export async function listPlants(
  session: GrowattSession,
  _baseUrl?: string
): Promise<NormalizedPlant[]> {
  const base = session.baseUrl;
  const headers: Record<string, string> = {
    Cookie: session.cookie,
    "User-Agent": AGENT,
  };

  // 1. Primary: PlantListAPI.do (requires userId)
  if (session.userId) {
    try {
      const url = `${base}/PlantListAPI.do?userId=${session.userId}`;
      console.log(`Growatt: tentando GET ${url}`);
      const resp = await fetch(url, { headers, redirect: "manual" });
      const text = await resp.text();
      console.log(`Growatt: PlantListAPI.do → ${text.substring(0, 500)}`);

      const data = JSON.parse(text);
      const plants = data.back || data.data || [];
      if (Array.isArray(plants) && plants.length > 0) {
        console.log(`Growatt: ${plants.length} planta(s) via PlantListAPI.do`);
        return plants.map(mapPlantResponse);
      }
    } catch (e) {
      console.log(`Growatt: PlantListAPI.do falhou: ${e}`);
    }
  }

  // 2. Fallback: index/getPlantListTitle (POST)
  const fallbacks: Array<{ url: string; method: string; body?: string }> = [
    {
      url: `${base}/index/getPlantListTitle`,
      method: "POST",
      body: new URLSearchParams({ currPage: "1", plantName: "" }).toString(),
    },
    {
      url: `${base}/panel/getDevicesByPlantList`,
      method: "POST",
      body: new URLSearchParams({ currPage: "1" }).toString(),
    },
  ];

  for (const attempt of fallbacks) {
    try {
      console.log(`Growatt: tentando ${attempt.method} ${attempt.url}`);
      const resp = await fetch(attempt.url, {
        method: attempt.method,
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: attempt.body,
      });

      const text = await resp.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.log(`Growatt: ${attempt.url} retornou HTML, pulando...`);
        continue;
      }

      const candidates = [data.back?.data, data.back, data.datas, data.data, data.result];
      for (const raw of candidates) {
        const list = Array.isArray(raw) ? raw : (raw?.plantList || raw?.data || null);
        if (Array.isArray(list) && list.length > 0) {
          console.log(`Growatt: ${list.length} planta(s) encontrada(s)`);
          return list.map(mapPlantResponse);
        }
      }
    } catch (e) {
      console.log(`Growatt: erro em ${attempt.url}: ${e}`);
    }
  }

  console.log("Growatt: nenhuma planta encontrada");
  return [];
}

function mapPlantResponse(p: any): NormalizedPlant {
  return {
    external_id: String(p.id || p.plantId),
    name: p.plantName || p.name || "Unknown",
    location: [p.city, p.country].filter(Boolean).join(", ") || p.location || "",
    latitude: p.lat ? parseFloat(p.lat) : undefined,
    longitude: p.lng ? parseFloat(p.lng) : undefined,
    capacity_kwp: p.nominalPower ? parseFloat(p.nominalPower) : undefined,
    status: mapPlantStatus(p.status),
  };
}

export async function listDevices(
  session: GrowattSession,
  plantId: string,
  _baseUrl?: string
): Promise<NormalizedDevice[]> {
  const url = `${session.baseUrl}/panel/getDevicesByPlant?plantId=${plantId}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Cookie: session.cookie,
      "User-Agent": AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ currPage: "1" }).toString(),
  });
  const text = await resp.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Growatt listDevices: resposta não é JSON`);
  }
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
  const resp = await fetch(
    `${session.baseUrl}/panel/getPlantData?plantId=${plantId}`,
    {
      headers: {
        Cookie: session.cookie,
        "User-Agent": AGENT,
      },
    }
  );
  const text = await resp.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Growatt collectEnergy: resposta não é JSON`);
  }
  const plantData = data.back || data.obj || data.data || {};
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
