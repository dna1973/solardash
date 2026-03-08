// Growatt Adapter - connects to Growatt ShineServer (server.growatt.com)
// Uses the same web portal API that the browser uses
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

/** Clean up base URL: ensure https, strip paths like /selectPlant, trailing slashes */
function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!u.startsWith("http")) u = `https://${u}`;
  // Remove known sub-paths users might copy from browser
  try {
    const parsed = new URL(u);
    // Keep only origin (protocol + host)
    u = parsed.origin;
  } catch {
    u = u.replace(/\/+$/, "");
  }
  return u;
}

export async function authenticate(
  credentials: AdapterCredentials
): Promise<GrowattSession> {
  if (!credentials.username || !credentials.password) {
    throw new Error("Growatt: credenciais (usuário e senha) são obrigatórias");
  }

  const baseUrl = normalizeUrl(credentials.base_url || "https://server.growatt.com");

  const loginUrl = `${baseUrl}/login`;
  console.log(`Growatt: login em ${loginUrl}`);

  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
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

  // Collect all cookies from response
  const cookies: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value.split(";")[0]);
    }
  });
  const cookieStr = cookies.join("; ") || "";

  // Parse login body
  let body: any = {};
  const text = await response.text();
  try {
    body = JSON.parse(text);
  } catch {
    // Some servers redirect on success — cookie is the auth
  }

  const loginSuccess = body.back?.success === true || body.result === 1 || body.back?.userId;
  if (!loginSuccess && !cookieStr) {
    const errMsg = body.back?.msg || body.error || "credenciais inválidas";
    throw new Error(`Growatt: login falhou — ${errMsg}`);
  }

  const userId = String(body.back?.userId || body.back?.user?.id || body.user?.id || "");
  console.log(`Growatt: login OK, userId=${userId || "?"}, cookies=${cookieStr ? "yes" : "no"}`);

  return { cookie: cookieStr, userId, baseUrl };
}

export async function listPlants(
  session: GrowattSession,
  _baseUrl?: string
): Promise<NormalizedPlant[]> {
  const base = session.baseUrl;
  const headers: Record<string, string> = {
    Cookie: session.cookie,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
  };

  // Endpoints to try — ShineServer portal uses POST with pagination
  const attempts: Array<{ url: string; method: string; body?: string }> = [
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

  // If we have userId, also try the userId-based endpoint
  if (session.userId) {
    attempts.push({
      url: `${base}/panel/getPlantList?userId=${session.userId}`,
      method: "POST",
      body: new URLSearchParams({ currPage: "1" }).toString(),
    });
  }

  for (const attempt of attempts) {
    try {
      console.log(`Growatt: tentando ${attempt.method} ${attempt.url}`);
      const response = await fetch(attempt.url, {
        method: attempt.method,
        headers,
        body: attempt.body,
      });

      const text = await response.text();
      console.log(`Growatt: resposta ${attempt.url} → ${text.substring(0, 300)}`);

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.log(`Growatt: ${attempt.url} retornou HTML, pulando...`);
        continue;
      }

      // Extract plants from various response shapes
      const candidates = [
        data.back?.data,
        data.back,
        data.datas,
        data.data,
        data.result,
        data.obj?.plantList,
        data.obj?.datas,
      ];

      for (const raw of candidates) {
        const list = Array.isArray(raw) ? raw : (raw?.plantList || raw?.data || null);
        if (Array.isArray(list) && list.length > 0) {
          console.log(`Growatt: ${list.length} planta(s) encontrada(s)`);
          return list.map(mapPlantResponse);
        }
      }

      // Check totalData / total for pagination info
      const total = data.back?.totalData || data.totalData || data.total || 0;
      console.log(`Growatt: ${attempt.url} → parsed OK, total=${total}, mas lista vazia`);
    } catch (e) {
      console.log(`Growatt: erro em ${attempt.url}: ${e}`);
    }
  }

  console.log("Growatt: nenhuma planta encontrada em nenhum endpoint");
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
  const response = await fetch(
    `${session.baseUrl}/panel/getDevicesByPlant?plantId=${plantId}`,
    {
      method: "POST",
      headers: {
        Cookie: session.cookie,
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: new URLSearchParams({ currPage: "1" }).toString(),
    }
  );
  const text = await response.text();
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
  const response = await fetch(
    `${session.baseUrl}/panel/getPlantData?plantId=${plantId}`,
    {
      headers: {
        Cookie: session.cookie,
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );
  const text = await response.text();
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
