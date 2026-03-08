// Fronius Adapter - connects to Fronius Solar API (local network)
// Docs: https://www.fronius.com/en/photovoltaics/products/all-products/system-monitoring/open-interfaces/fronius-solar-api-json
// Access: Local network - no auth required, just IP address of the datalogger
import type {
  AdapterCredentials,
  NormalizedPlant,
  NormalizedDevice,
  NormalizedEnergyData,
} from "../_shared/solar-types.ts";

function getBaseUrl(credentials: AdapterCredentials): string {
  const url = credentials.base_url;
  if (!url) throw new Error("Fronius requires the datalogger IP/URL (base_url)");
  return url.replace(/\/$/, "");
}

export async function listPlants(
  credentials: AdapterCredentials
): Promise<NormalizedPlant[]> {
  const baseUrl = getBaseUrl(credentials);

  // Fronius has a single "plant" per datalogger
  const response = await fetch(
    `${baseUrl}/solar_api/v1/GetPowerFlowRealtimeData.fcgi`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fronius API error [${response.status}]: ${text}`);
  }

  const data = await response.json();
  const site = data.Body?.Data?.Site || {};

  return [
    {
      external_id: "fronius-local",
      name: `Fronius Plant (${baseUrl})`,
      status: site.P_PV != null ? "online" : "offline",
      capacity_kwp: site.E_Total ? undefined : undefined,
    },
  ];
}

export async function listDevices(
  credentials: AdapterCredentials
): Promise<NormalizedDevice[]> {
  const baseUrl = getBaseUrl(credentials);

  const response = await fetch(
    `${baseUrl}/solar_api/v1/GetInverterInfo.cgi`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fronius API error [${response.status}]: ${text}`);
  }

  const data = await response.json();
  const inverters = data.Body?.Data || {};

  return Object.entries(inverters).map(([id, inv]: [string, any]) => ({
    external_id: id,
    plant_external_id: "fronius-local",
    manufacturer: "Fronius",
    model: inv.DT?.toString() || "Unknown",
    serial_number: inv.UniqueID || id,
    device_type: "inverter" as const,
    status: mapInverterStatus(inv.StatusCode),
    last_communication: undefined,
  }));
}

export async function collectEnergy(
  credentials: AdapterCredentials,
  _plantId?: string,
  deviceId?: string
): Promise<NormalizedEnergyData[]> {
  const baseUrl = getBaseUrl(credentials);
  const results: NormalizedEnergyData[] = [];
  const now = new Date().toISOString();

  // Get real-time power flow
  const flowResp = await fetch(
    `${baseUrl}/solar_api/v1/GetPowerFlowRealtimeData.fcgi`
  );

  if (flowResp.ok) {
    const flowData = await flowResp.json();
    const site = flowData.Body?.Data?.Site || {};

    results.push({
      plant_external_id: "fronius-local",
      device_external_id: deviceId,
      timestamp: now,
      generation_power_kw: Math.abs(site.P_PV || 0) / 1000,
      consumption_power_kw: Math.abs(site.P_Load || 0) / 1000,
      energy_generated_kwh: site.E_Day ? site.E_Day / 1000 : undefined,
      status: "ok",
    });
  } else {
    await flowResp.text();
  }

  // Get inverter real-time data if device specified
  if (deviceId) {
    const invResp = await fetch(
      `${baseUrl}/solar_api/v1/GetInverterRealtimeData.cgi?Scope=Device&DeviceId=${deviceId}&DataCollection=CommonInverterData`
    );

    if (invResp.ok) {
      const invData = await invResp.json();
      const inv = invData.Body?.Data || {};

      results.push({
        plant_external_id: "fronius-local",
        device_external_id: deviceId,
        timestamp: now,
        generation_power_kw: (inv.PAC?.Value || 0) / 1000,
        energy_generated_kwh: inv.DAY_ENERGY?.Value
          ? inv.DAY_ENERGY.Value / 1000
          : undefined,
        voltage: inv.UAC?.Value,
        current: inv.IAC?.Value,
        temperature: undefined,
        status: "ok",
      });
    } else {
      await invResp.text();
    }
  }

  return results;
}

function mapInverterStatus(code: number): NormalizedDevice["status"] {
  // Fronius status codes: 7 = running, 8 = standby, others = error
  if (code === 7) return "online";
  if (code === 8) return "online"; // standby is still communicating
  return "warning";
}
