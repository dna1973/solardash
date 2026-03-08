// Shared types for solar integration adapters
// Used by all edge functions in supabase/functions/

export interface NormalizedPlant {
  external_id: string;
  name: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  capacity_kwp?: number;
  status: "online" | "offline" | "warning" | "maintenance";
}

export interface NormalizedDevice {
  external_id: string;
  plant_external_id: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  device_type: "inverter" | "meter" | "datalogger" | "gateway" | "sensor";
  status: "online" | "offline" | "warning";
  last_communication?: string;
}

export interface NormalizedEnergyData {
  plant_external_id: string;
  device_external_id?: string;
  timestamp: string;
  generation_power_kw?: number;
  consumption_power_kw?: number;
  energy_generated_kwh?: number;
  energy_consumed_kwh?: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  status?: string;
}

export interface AdapterCredentials {
  username?: string;
  password?: string;
  api_key?: string;
  token?: string;
  base_url?: string;
  system_id?: string;
  plant_id?: string;
}

export interface AdapterResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  manufacturer: string;
}

export interface CollectorRequest {
  manufacturer: string;
  credentials: AdapterCredentials;
  plant_external_id?: string;
  device_serial?: string;
  action: "list_plants" | "list_devices" | "collect_energy" | "collect_historical" | "device_status";
  start_date?: string;
  end_date?: string;
  level?: "daily" | "monthly";
}

// Adapter interface contract - each manufacturer must implement these
export interface SolarAdapter {
  manufacturer: string;
  authenticate(credentials: AdapterCredentials): Promise<string>; // returns session/token
  listPlants(session: string): Promise<NormalizedPlant[]>;
  listDevices(session: string, plantId: string): Promise<NormalizedDevice[]>;
  collectEnergy(session: string, plantId: string, deviceSerial?: string): Promise<NormalizedEnergyData[]>;
  getDeviceStatus(session: string, plantId: string, deviceSerial: string): Promise<NormalizedDevice>;
}

export const SUPPORTED_MANUFACTURERS = ["growatt", "solaredge", "fronius", "apsystems", "hoymiles", "goodwe", "huawei", "sma"] as const;
export type ManufacturerSlug = typeof SUPPORTED_MANUFACTURERS[number];
