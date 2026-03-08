// Growatt Adapter — OpenAPI V1 (token-based authentication)
// Docs: https://openapi.growatt.com/v1/
import type {
  AdapterCredentials,
  NormalizedPlant,
  NormalizedDevice,
  NormalizedEnergyData,
} from "../solar-types.ts";

interface GrowattSession {
  token: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = "https://openapi.growatt.com";

function buildUrl(baseUrl: string, path: string, params: Record<string, string>): string {
  const url = new URL(`${baseUrl}/v1/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  return url.toString();
}

async function apiGet(session: GrowattSession, path: string, params: Record<string, string> = {}): Promise<any> {
  const url = buildUrl(session.baseUrl, path, { ...params, token: session.token });
  console.log(`Growatt OpenAPI GET: ${path} params=${JSON.stringify(params)}`);
  
  const resp = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  
  const text = await resp.text();
  console.log(`Growatt OpenAPI response (${path}): ${text.substring(0, 500)}`);
  
  try {
    const json = JSON.parse(text);
    if (json.error_code !== undefined && json.error_code !== 0) {
      throw new Error(`Growatt API error ${json.error_code}: ${json.error_msg || "unknown"}`);
    }
    return json;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`Growatt API: resposta não é JSON (${text.substring(0, 100)})`);
    }
    throw e;
  }
}

async function apiPost(session: GrowattSession, path: string, params: Record<string, string> = {}): Promise<any> {
  const url = buildUrl(session.baseUrl, path, {});
  const body = new URLSearchParams({ ...params, token: session.token });
  console.log(`Growatt OpenAPI POST: ${path} params=${JSON.stringify(params)}`);
  
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  
  const text = await resp.text();
  console.log(`Growatt OpenAPI response (${path}): ${text.substring(0, 500)}`);
  
  try {
    const json = JSON.parse(text);
    if (json.error_code !== undefined && json.error_code !== 0) {
      throw new Error(`Growatt API error ${json.error_code}: ${json.error_msg || "unknown"}`);
    }
    return json;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`Growatt API: resposta não é JSON (${text.substring(0, 100)})`);
    }
    throw e;
  }
}

export async function authenticate(
  credentials: AdapterCredentials
): Promise<GrowattSession> {
  const token = credentials.token || credentials.api_key;
  if (!token) {
    throw new Error("Growatt OpenAPI V1: token é obrigatório");
  }

  let baseUrl = DEFAULT_BASE_URL;
  if (credentials.base_url) {
    let u = credentials.base_url.trim();
    if (!u.startsWith("http")) u = `https://${u}`;
    // Remove trailing /v1/ or /v1 if user included it
    u = u.replace(/\/v1\/?$/, "");
    try { baseUrl = new URL(u).origin; } catch { baseUrl = u.replace(/\/+$/, ""); }
  }

  const session: GrowattSession = { token, baseUrl };

  // Validate token by listing plants
  console.log(`Growatt OpenAPI: autenticando com token em ${baseUrl}`);
  try {
    const result = await apiGet(session, "plant/list", { page: "1", perpage: "1" });
    const count = result?.data?.count || 0;
    console.log(`Growatt OpenAPI: token válido, ${count} planta(s) encontrada(s)`);
  } catch (e) {
    throw new Error(`Growatt OpenAPI: token inválido ou sem permissão — ${e instanceof Error ? e.message : e}`);
  }

  return session;
}

export async function listPlants(
  session: GrowattSession,
  _baseUrl?: string
): Promise<NormalizedPlant[]> {
  const allPlants: NormalizedPlant[] = [];
  let page = 1;
  const perpage = 20;
  let total = 0;

  do {
    const result = await apiGet(session, "plant/list", {
      page: String(page),
      perpage: String(perpage),
    });

    const data = result?.data;
    total = data?.count || 0;
    const plants = data?.plants || [];

    for (const p of plants) {
      const plantId = String(p.plant_id || p.id);

      // Get plant overview data (current_power, today_energy, peak_power)
      let overview: any = {};
      try {
        const ovResult = await apiGet(session, "plant/data", { plant_id: plantId });
        overview = ovResult?.data || {};
      } catch (e) {
        console.log(`Growatt OpenAPI: erro ao obter dados da planta ${plantId}: ${e}`);
      }

      // Get plant details (location, coords)
      let details: any = {};
      try {
        const detResult = await apiGet(session, "plant/details", { plant_id: plantId });
        details = detResult?.data || {};
      } catch (e) {
        console.log(`Growatt OpenAPI: erro ao obter detalhes da planta ${plantId}: ${e}`);
      }

      const currentPower = parseFloat(String(overview.current_power || 0));
      const peakPower = parseFloat(String(overview.peak_power || details.peak_power || p.peak_power || 0));

      let status: NormalizedPlant["status"] = "offline";
      if (currentPower > 0) {
        status = "online";
      } else if (details.status !== undefined) {
        status = mapPlantStatus(details.status);
      }

      allPlants.push({
        external_id: plantId,
        name: p.name || details.name || `Plant ${plantId}`,
        location: [details.city, details.country].filter(Boolean).join(", ") || details.location || "",
        latitude: details.latitude ? parseFloat(details.latitude) : undefined,
        longitude: details.longitude ? parseFloat(details.longitude) : undefined,
        capacity_kwp: peakPower > 0 ? peakPower : undefined,
        status,
      });
    }

    page++;
  } while (allPlants.length < total);

  console.log(`Growatt OpenAPI: ${allPlants.length} planta(s) listada(s)`);
  return allPlants;
}

export async function listDevices(
  session: GrowattSession,
  plantId: string,
  _baseUrl?: string
): Promise<NormalizedDevice[]> {
  const allDevices: NormalizedDevice[] = [];
  let page = 1;
  const perpage = 20;
  let total = 0;

  do {
    const result = await apiGet(session, "device/list", {
      plant_id: plantId,
      page: String(page),
      perpage: String(perpage),
    });

    const data = result?.data;
    total = data?.count || 0;
    const devices = data?.devices || [];

    for (const d of devices) {
      allDevices.push({
        external_id: d.device_sn || d.sn,
        plant_external_id: plantId,
        manufacturer: "Growatt",
        model: d.model || "Unknown",
        serial_number: d.device_sn || d.sn,
        device_type: mapDeviceType(d.type),
        status: d.last_update_time ? "online" : "offline",
        last_communication: d.last_update_time || undefined,
      });
    }

    page++;
  } while (allDevices.length < total);

  console.log(`Growatt OpenAPI: ${allDevices.length} dispositivo(s) na planta ${plantId}`);
  return allDevices;
}

export async function collectEnergy(
  session: GrowattSession,
  plantId: string,
  _deviceSerial?: string,
  _baseUrl?: string
): Promise<NormalizedEnergyData[]> {
  const results: NormalizedEnergyData[] = [];

  // 1. Get current plant overview (real-time snapshot)
  try {
    const ovResult = await apiGet(session, "plant/data", { plant_id: plantId });
    const ov = ovResult?.data || {};

    const currentPower = parseFloat(String(ov.current_power || 0));
    const todayEnergy = parseFloat(String(ov.today_energy || 0));
    const totalEnergy = parseFloat(String(ov.total_energy || 0));

    console.log(`Growatt OpenAPI collectEnergy ${plantId}: power=${currentPower}kW, today=${todayEnergy}kWh, total=${totalEnergy}kWh`);

    results.push({
      plant_external_id: plantId,
      device_external_id: _deviceSerial,
      timestamp: new Date().toISOString(),
      generation_power_kw: currentPower,
      energy_generated_kwh: todayEnergy,
      energy_consumed_kwh: 0,
      consumption_power_kw: 0,
      status: currentPower > 0 || todayEnergy > 0 ? "ok" : "no_data",
    });
  } catch (e) {
    console.log(`Growatt OpenAPI: erro ao coletar dados da planta ${plantId}: ${e}`);
    results.push({
      plant_external_id: plantId,
      device_external_id: _deviceSerial,
      timestamp: new Date().toISOString(),
      generation_power_kw: 0,
      energy_generated_kwh: 0,
      energy_consumed_kwh: 0,
      consumption_power_kw: 0,
      status: "no_data",
    });
  }

  // 2. Get historical daily energy for last 30 days
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const histResult = await apiGet(session, "plant/energy", {
      plant_id: plantId,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      time_unit: "day",
      page: "1",
      perpage: "31",
    });

    const energys = histResult?.data?.energys || [];
    for (const entry of energys) {
      if (entry.date && entry.energy !== undefined) {
        results.push({
          plant_external_id: plantId,
          timestamp: `${entry.date}T12:00:00Z`,
          generation_power_kw: 0,
          energy_generated_kwh: parseFloat(String(entry.energy || 0)),
          energy_consumed_kwh: 0,
          consumption_power_kw: 0,
          status: "ok",
        });
      }
    }
    console.log(`Growatt OpenAPI: ${energys.length} ponto(s) históricos diários para planta ${plantId}`);
  } catch (e) {
    console.log(`Growatt OpenAPI: erro ao coletar histórico da planta ${plantId}: ${e}`);
  }

  return results;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function mapPlantStatus(status: any): NormalizedPlant["status"] {
  const s = String(status).toLowerCase();
  if (s === "1" || s === "online" || s === "normal") return "online";
  if (s === "2" || s === "alarm" || s === "warning") return "warning";
  if (s === "3" || s === "offline" || s === "0") return "offline";
  return "offline";
}

function mapDeviceType(type: any): NormalizedDevice["device_type"] {
  const t = String(type).toLowerCase();
  if (t === "1" || t.includes("inverter") || t === "inv") return "inverter";
  if (t === "2" || t.includes("meter")) return "meter";
  if (t === "3" || t.includes("datalog")) return "datalogger";
  if (t.includes("gateway")) return "gateway";
  return "inverter";
}
