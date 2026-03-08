// Hoymiles Adapter — S-Miles Cloud API
// Based on reverse-engineered API from krikk/hoymiles-ms-a2-to-mqtt and dmslabsbr/hoymiles
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

// Minimal MD5 implementation for Deno edge functions
function simpleMD5(string: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);  d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);   b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);   d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);  b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);   d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);      b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);  d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);   d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);  b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);   d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);  b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);  b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);      d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);  d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);  b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);   d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);  b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);   d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);  b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);   d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);  d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);   b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);   d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);   d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);   b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function md51(s: string) {
    const n = s.length;
    let state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= n; i += 64) { md5cycle(state, md5blk(s.substring(i - 64, i))); }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) { tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3); }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  function md5blk(s: string) {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  const hex_chr = '0123456789abcdef'.split('');
  function rhex(n: number) {
    let s = '';
    for (let j = 0; j < 4; j++) { s += hex_chr[(n >> (j * 8 + 4)) & 0x0f] + hex_chr[(n >> (j * 8)) & 0x0f]; }
    return s;
  }
  function hex(x: number[]) { for (let i = 0; i < x.length; i++) x[i] = rhex(x[i] as number); return (x as unknown as string[]).join(''); }
  function add32(a: number, b: number) { return (a + b) & 0xFFFFFFFF; }
  return hex(md51(string));
}

// Encode password as: MD5(password).Base64(SHA256(password))
async function encodePassword(password: string): Promise<string> {
  const md5Hash = simpleMD5(password);

  // SHA-256 using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const sha256Buffer = await crypto.subtle.digest("SHA-256", data);
  const sha256Bytes = new Uint8Array(sha256Buffer);

  // Base64 encode the SHA-256 hash
  let binary = "";
  for (const byte of sha256Bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64Hash = btoa(binary);

  return `${md5Hash}.${base64Hash}`;
}

// ─── API helpers ───

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Accept": "application/json",
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
