// Hoymiles Adapter — S-Miles Cloud API
// Based on reverse-engineered API from krikk/hoymiles-ms-a2-to-mqtt and dmslabsbr/hoymiles
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import type {
  AdapterCredentials,
  NormalizedPlant,
  NormalizedDevice,
  NormalizedEnergyData,
} from "../solar-types.ts";

interface HoymilesSession {
  token: string;
  baseUrl: string; // e.g. https://neapi.hoymiles.com
}

const REGION_URL = "https://euapi.hoymiles.com/iam/pub/0/c/region_c";

// ─── Crypto helpers ───

// Encode password as: MD5(password).Base64(SHA256(password))
async function encodePassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // MD5 hash (hex)
  const md5Buffer = await stdCrypto.subtle.digest("MD5", data);
  const md5Hash = encodeHex(new Uint8Array(md5Buffer));

  // SHA-256 hash (base64)
  const sha256Buffer = await stdCrypto.subtle.digest("SHA-256", data);
  const sha256Bytes = new Uint8Array(sha256Buffer);
  let binary = "";
  for (const byte of sha256Bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64Hash = btoa(binary);

  console.log(`Hoymiles: MD5 hash prefix: ${md5Hash.substring(0, 8)}...`);

  return `${md5Hash}.${base64Hash}`;
}

// ─── API helpers ───

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Accept": "application/json",
  "User-Agent": "sma/ad/1.4.0/159/0",
  "Charset": "UTF-8",
  "language": "en_us",
};

async function apiPost(session: HoymilesSession, path: string, body: Record<string, any>): Promise<any> {
  const url = `${session.baseUrl}${path}`;
  console.log(`Hoymiles API POST: ${url}`);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      "Authorization": session.token,
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  console.log(`Hoymiles API response (${path}): status=${resp.status}, body=${text.substring(0, 500)}`);

  try {
    const json = JSON.parse(text);
    if (json.status !== "0" && json.status !== 0) {
      throw new Error(`Hoymiles API error: status=${json.status}, message=${json.message}`);
    }
    return json;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`Hoymiles API: resposta não é JSON (HTTP ${resp.status}: ${text.substring(0, 100)})`);
    }
    throw e;
  }
}

// ─── Public API ───

export async function authenticate(credentials: AdapterCredentials): Promise<HoymilesSession> {
  const username = credentials.username;
  const password = credentials.password;

  if (!username || !password) {
    throw new Error("Hoymiles: usuário e senha são obrigatórios");
  }

  console.log(`Hoymiles: autenticando usuário ${username}`);

  // Step 1: Get region / login_url for the user
  console.log(`Hoymiles: buscando região para ${username}`);
  const regionResp = await fetch(REGION_URL, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email: username }),
  });

  const regionText = await regionResp.text();
  console.log(`Hoymiles region response (HTTP ${regionResp.status}): ${regionText.substring(0, 300)}`);

  let loginUrl = "https://neapi.hoymiles.com"; // fallback
  try {
    const regionJson = JSON.parse(regionText);
    if (regionJson.status === "0" && regionJson.data?.login_url) {
      loginUrl = regionJson.data.login_url;
      console.log(`Hoymiles: login_url da região: ${loginUrl}`);
    } else {
      console.log(`Hoymiles: região não retornou login_url, usando fallback: ${loginUrl}`);
    }
  } catch {
    console.log(`Hoymiles: erro ao parsear região, usando fallback: ${loginUrl}`);
  }

  // Step 2: Encode password as MD5.Base64(SHA256)
  const encodedPassword = await encodePassword(password);
  console.log(`Hoymiles: senha codificada (formato MD5.B64SHA256)`);

  // Step 3: Login
  const loginEndpoint = `${loginUrl}/iam/pub/0/c/login_c`;
  console.log(`Hoymiles: POST ${loginEndpoint}`);

  const loginResp = await fetch(loginEndpoint, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      user_name: username,
      password: encodedPassword,
    }),
  });

  const loginText = await loginResp.text();
  console.log(`Hoymiles auth response (HTTP ${loginResp.status}): ${loginText.substring(0, 300)}`);

  let loginJson: any;
  try {
    loginJson = JSON.parse(loginText);
  } catch {
    throw new Error(`Hoymiles: resposta de autenticação inválida (HTTP ${loginResp.status})`);
  }

  if (loginJson.status !== "0" && loginJson.status !== 0) {
    throw new Error(`Hoymiles: autenticação falhou — ${loginJson.message || "credenciais inválidas"} (status=${loginJson.status})`);
  }

  const token = loginJson.data?.token;
  if (!token) {
    throw new Error("Hoymiles: token não encontrado na resposta");
  }

  console.log("Hoymiles: autenticação bem-sucedida");

  // Use neapi.hoymiles.com as the data API base
  const dataBaseUrl = "https://neapi.hoymiles.com";
  return { token, baseUrl: dataBaseUrl };
}

export async function listPlants(session: HoymilesSession): Promise<NormalizedPlant[]> {
  const allPlants: NormalizedPlant[] = [];

  const result = await apiPost(session, "/pvmc/api/0/station/select_by_page_c", {
    page: 1,
    page_size: 50,
  });

  const list = result?.data?.list || [];

  for (const s of list) {
    if (!s) continue;
    const stationId = String(s.sid || s.id);
    if (!stationId || stationId === "undefined") continue;

    const capacityKwp = parseFloat(String(s.capacity || s.installed_capacity || s.plant_capacity || 0)) / 1000;

    let status: NormalizedPlant["status"] = "offline";
    if (s.real_power && parseFloat(String(s.real_power)) > 0) {
      status = "online";
    } else if (s.warn_flag === 1) {
      status = "warning";
    }

    allPlants.push({
      external_id: stationId,
      name: s.name || s.station_name || `Station ${stationId}`,
      location: s.address || s.location_address || "",
      latitude: s.latitude ? parseFloat(String(s.latitude)) : undefined,
      longitude: s.longitude ? parseFloat(String(s.longitude)) : undefined,
      capacity_kwp: capacityKwp > 0 ? capacityKwp : undefined,
      status,
    });
  }

  console.log(`Hoymiles: ${allPlants.length} estação(ões) listada(s)`);
  return allPlants;
}

export async function listDevices(session: HoymilesSession, stationId: string): Promise<NormalizedDevice[]> {
  const allDevices: NormalizedDevice[] = [];

  try {
    // Use the station device tree endpoint
    const result = await apiPost(session, "/pvmc/api/0/station/get_sd_uri_c", {
      sid: parseInt(stationId),
    });

    // Also try to get device list from station data
    const stationResult = await apiPost(session, "/pvmc/api/0/station/select_by_page_c", {
      page: 1,
      page_size: 50,
    });

    const stations = stationResult?.data?.list || [];
    const station = stations.find((s: any) => String(s.sid || s.id) === stationId);

    if (station?.devices) {
      for (const d of station.devices) {
        if (!d) continue;
        const deviceId = String(d.id || d.sn || d.device_sn);
        if (deviceId && deviceId !== "undefined") {
          allDevices.push({
            external_id: deviceId,
            plant_external_id: stationId,
            manufacturer: "Hoymiles",
            model: d.model_no || d.model || "Microinverter",
            serial_number: d.sn || d.device_sn || deviceId,
            device_type: "inverter",
            status: d.warn_flag === 0 ? "online" : d.warn_flag === 1 ? "warning" : "offline",
            last_communication: d.last_data_time || undefined,
          });
        }
      }
    }
  } catch (e) {
    console.error(`Hoymiles: erro ao listar dispositivos da estação ${stationId}: ${e}`);
  }

  console.log(`Hoymiles: ${allDevices.length} dispositivo(s) na estação ${stationId}`);
  return allDevices;
}

export async function collectEnergy(
  session: HoymilesSession,
  stationId: string,
  _deviceSerial?: string
): Promise<NormalizedEnergyData[]> {
  const results: NormalizedEnergyData[] = [];

  try {
    // Get real-time station data
    const rtResult = await apiPost(session, "/pvm-data/api/0/station/data/count_station_real_data", {
      sid: parseInt(stationId),
    });

    const data = rtResult?.data || {};

    const currentPowerW = parseFloat(String(data.real_power || data.last_data_time_power || 0));
    const todayEnergyWh = parseFloat(String(data.today_eq || 0));
    const consumptionPowerW = parseFloat(String(data.co_real_power || 0));
    const consumptionTodayWh = parseFloat(String(data.co_today_eq || 0));

    console.log(`Hoymiles collectEnergy ${stationId}: power=${currentPowerW}W, today=${todayEnergyWh}Wh`);

    results.push({
      plant_external_id: stationId,
      device_external_id: _deviceSerial,
      timestamp: new Date().toISOString(),
      generation_power_kw: currentPowerW / 1000,
      energy_generated_kwh: todayEnergyWh / 1000,
      consumption_power_kw: consumptionPowerW / 1000,
      energy_consumed_kwh: consumptionTodayWh / 1000,
      status: currentPowerW > 0 || todayEnergyWh > 0 ? "ok" : "no_data",
    });
  } catch (e) {
    console.error(`Hoymiles: erro ao coletar dados da estação ${stationId}: ${e}`);
    results.push({
      plant_external_id: stationId,
      device_external_id: _deviceSerial,
      timestamp: new Date().toISOString(),
      generation_power_kw: 0,
      energy_generated_kwh: 0,
      consumption_power_kw: 0,
      energy_consumed_kwh: 0,
      status: "no_data",
    });
  }

  return results;
}
