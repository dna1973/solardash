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
function hashPassword(password: string): string {
  // Simple MD5 implementation for Deno (crypto.subtle doesn't support MD5)
  function md5(str: string): string {
    function safeAdd(x: number, y: number) {
      const lsw = (x & 0xffff) + (y & 0xffff);
      return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff);
    }
    function bitRotateLeft(num: number, cnt: number) {
      return (num << cnt) | (num >>> (32 - cnt));
    }
    function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
      return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }
    function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
      return md5cmn((b & c) | (~b & d), a, b, x, s, t);
    }
    function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
      return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
    }
    function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
      return md5cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
      return md5cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    function binlMD5(x: number[], len: number) {
      x[len >> 5] |= 0x80 << (len % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;
      let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
      for (let i = 0; i < x.length; i += 16) {
        const oa = a, ob = b, oc = c, od = d;
        a = md5ff(a,b,c,d,x[i],7,-680876936); d = md5ff(d,a,b,c,x[i+1],12,-389564586);
        c = md5ff(c,d,a,b,x[i+2],17,606105819); b = md5ff(b,c,d,a,x[i+3],22,-1044525330);
        a = md5ff(a,b,c,d,x[i+4],7,-176418897); d = md5ff(d,a,b,c,x[i+5],12,1200080426);
        c = md5ff(c,d,a,b,x[i+6],17,-1473231341); b = md5ff(b,c,d,a,x[i+7],22,-45705983);
        a = md5ff(a,b,c,d,x[i+8],7,1770035416); d = md5ff(d,a,b,c,x[i+9],12,-1958414417);
        c = md5ff(c,d,a,b,x[i+10],17,-42063); b = md5ff(b,c,d,a,x[i+11],22,-1990404162);
        a = md5ff(a,b,c,d,x[i+12],7,1804603682); d = md5ff(d,a,b,c,x[i+13],12,-40341101);
        c = md5ff(c,d,a,b,x[i+14],17,-1502002290); b = md5ff(b,c,d,a,x[i+15],22,1236535329);
        a = md5gg(a,b,c,d,x[i+1],5,-165796510); d = md5gg(d,a,b,c,x[i+6],9,-1069501632);
        c = md5gg(c,d,a,b,x[i+11],14,643717713); b = md5gg(b,c,d,a,x[i],20,-373897302);
        a = md5gg(a,b,c,d,x[i+5],5,-701558691); d = md5gg(d,a,b,c,x[i+10],9,38016083);
        c = md5gg(c,d,a,b,x[i+15],14,-660478335); b = md5gg(b,c,d,a,x[i+4],20,-405537848);
        a = md5gg(a,b,c,d,x[i+9],5,568446438); d = md5gg(d,a,b,c,x[i+14],9,-1019803690);
        c = md5gg(c,d,a,b,x[i+3],14,-187363961); b = md5gg(b,c,d,a,x[i+8],20,1163531501);
        a = md5gg(a,b,c,d,x[i+13],5,-1444681467); d = md5gg(d,a,b,c,x[i+2],9,-51403784);
        c = md5gg(c,d,a,b,x[i+7],14,1735328473); b = md5gg(b,c,d,a,x[i+12],20,-1926607734);
        a = md5hh(a,b,c,d,x[i+5],4,-378558); d = md5hh(d,a,b,c,x[i+8],11,-2022574463);
        c = md5hh(c,d,a,b,x[i+11],16,1839030562); b = md5hh(b,c,d,a,x[i+14],23,-35309556);
        a = md5hh(a,b,c,d,x[i+1],4,-1530992060); d = md5hh(d,a,b,c,x[i+4],11,1272893353);
        c = md5hh(c,d,a,b,x[i+7],16,-155497632); b = md5hh(b,c,d,a,x[i+10],23,-1094730640);
        a = md5hh(a,b,c,d,x[i+13],4,681279174); d = md5hh(d,a,b,c,x[i],11,-358537222);
        c = md5hh(c,d,a,b,x[i+3],16,-722521979); b = md5hh(b,c,d,a,x[i+6],23,76029189);
        a = md5hh(a,b,c,d,x[i+9],4,-640364487); d = md5hh(d,a,b,c,x[i+12],11,-421815835);
        c = md5hh(c,d,a,b,x[i+15],16,530742520); b = md5hh(b,c,d,a,x[i+2],23,-995338651);
        a = md5ii(a,b,c,d,x[i],6,-198630844); d = md5ii(d,a,b,c,x[i+7],10,1126891415);
        c = md5ii(c,d,a,b,x[i+14],15,-1416354905); b = md5ii(b,c,d,a,x[i+5],21,-57434055);
        a = md5ii(a,b,c,d,x[i+12],6,1700485571); d = md5ii(d,a,b,c,x[i+3],10,-1894986606);
        c = md5ii(c,d,a,b,x[i+10],15,-1051523); b = md5ii(b,c,d,a,x[i+1],21,-2054922799);
        a = md5ii(a,b,c,d,x[i+8],6,1873313359); d = md5ii(d,a,b,c,x[i+15],10,-30611744);
        c = md5ii(c,d,a,b,x[i+6],15,-1560198380); b = md5ii(b,c,d,a,x[i+13],21,1309151649);
        a = md5ii(a,b,c,d,x[i+4],6,-145523070); d = md5ii(d,a,b,c,x[i+11],10,-1120210379);
        c = md5ii(c,d,a,b,x[i+2],15,718787259); b = md5ii(b,c,d,a,x[i+9],21,-343485551);
        a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
      }
      return [a, b, c, d];
    }
    function rstrMD5(s: string) {
      const input: number[] = [];
      for (let i = 0; i < s.length * 8; i += 8) {
        input[i >> 5] |= (s.charCodeAt(i / 8) & 0xff) << (i % 32);
      }
      const output = binlMD5(input, s.length * 8);
      let result = "";
      for (let i = 0; i < output.length * 32; i += 8) {
        result += String.fromCharCode((output[i >> 5] >>> (i % 32)) & 0xff);
      }
      return result;
    }
    let hex = "";
    const raw = rstrMD5(str);
    for (let i = 0; i < raw.length; i++) {
      hex += raw.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return hex;
  }

  let hex = md5(password);
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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
    // newTwoLoginAPI.do may not work on all servers — try legacy
    console.log("Growatt: newTwoLoginAPI não retornou JSON, tentando login legado...");
    return authenticateLegacy(credentials, baseUrl);
  }

  const back = body.back || body;
  if (!back.success) {
    throw new Error(`Growatt: login falhou — ${back.msg || back.error || "credenciais inválidas"}`);
  }

  const userId = String(back.user?.id || back.userId || "");
  console.log(`Growatt: login OK, userId=${userId}, cookies=${cookieStr ? "yes" : "no"}`);

  return { cookie: cookieStr, userId, baseUrl };
}

/** Fallback: legacy /login endpoint with plain password */
async function authenticateLegacy(
  credentials: AdapterCredentials,
  baseUrl: string,
  existingCookies?: string
): Promise<GrowattSession> {
  const loginUrl = `${baseUrl}/login`;
  console.log(`Growatt: tentando login legado em ${loginUrl}`);

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": AGENT,
  };
  if (existingCookies) reqHeaders["Cookie"] = existingCookies;

  const response = await fetch(loginUrl, {
    method: "POST",
    headers: reqHeaders,
    body: new URLSearchParams({
      account: credentials.username!,
      password: credentials.password!,
      validateCode: "",
      isReadPact: "0",
    }),
    redirect: "manual",
  });

  console.log(`Growatt: login legado status=${response.status}`);

  const cookies: string[] = [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value.split(";")[0]);
    }
  });

  // Log all response headers for debugging
  const allHeaders: string[] = [];
  response.headers.forEach((v, k) => allHeaders.push(`${k}: ${v.substring(0, 100)}`));
  console.log(`Growatt: login legado headers: ${allHeaders.join(" | ")}`);

  const cookieStr = [existingCookies, ...cookies].filter(Boolean).join("; ");

  const text = await response.text();
  console.log(`Growatt: login legado body (${text.length} chars): ${text.substring(0, 500)}`);

  let body: any = {};
  try {
    body = JSON.parse(text);
  } catch {
    // HTML redirect = success if we have cookies
  }

  const userId = String(body.back?.userId || body.back?.user?.id || "");
  console.log(`Growatt: login legado, userId=${userId}, cookies=${cookieStr ? "yes" : "no"}`);

  if (!cookieStr && !userId) {
    throw new Error("Growatt: login falhou — nenhum cookie ou userId retornado");
  }

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
