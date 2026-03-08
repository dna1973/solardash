// Mock data for the solar monitoring platform

export interface Plant {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  capacity_kwp: number;
  installation_date: string;
  status: 'online' | 'offline' | 'warning' | 'maintenance';
  current_power_kw: number;
  today_energy_kwh: number;
  monthly_energy_kwh: number;
  total_energy_mwh: number;
  device_count: number;
  efficiency: number;
}

export interface Device {
  id: string;
  plant_id: string;
  plant_name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  device_type: 'inverter' | 'meter' | 'datalogger' | 'gateway' | 'sensor';
  status: 'online' | 'offline' | 'warning';
  power_kw: number;
  temperature: number;
  last_communication: string;
}

export interface Alert {
  id: string;
  plant_id: string;
  plant_name: string;
  device_id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface EnergyDataPoint {
  time: string;
  generation: number;
  consumption: number;
}

export const plants: Plant[] = [
  { id: '1', name: 'Usina Solar Campinas I', location: 'Campinas, SP', latitude: -22.9099, longitude: -47.0626, capacity_kwp: 500, installation_date: '2023-03-15', status: 'online', current_power_kw: 385.2, today_energy_kwh: 2150.4, monthly_energy_kwh: 52300, total_energy_mwh: 845.2, device_count: 12, efficiency: 92 },
  { id: '2', name: 'Solar Park Ribeirão', location: 'Ribeirão Preto, SP', latitude: -21.1767, longitude: -47.8208, capacity_kwp: 1200, installation_date: '2022-08-20', status: 'online', current_power_kw: 980.7, today_energy_kwh: 5420.1, monthly_energy_kwh: 128500, total_energy_mwh: 2340.8, device_count: 28, efficiency: 95 },
  { id: '3', name: 'Fazenda Solar MG', location: 'Uberlândia, MG', latitude: -18.9186, longitude: -48.2772, capacity_kwp: 800, installation_date: '2023-06-10', status: 'warning', current_power_kw: 520.3, today_energy_kwh: 3100.8, monthly_energy_kwh: 78200, total_energy_mwh: 1120.5, device_count: 18, efficiency: 78 },
  { id: '4', name: 'Parque Fotovoltaico Goiás', location: 'Goiânia, GO', latitude: -16.6869, longitude: -49.2648, capacity_kwp: 2000, installation_date: '2022-01-05', status: 'online', current_power_kw: 1650.9, today_energy_kwh: 9200.5, monthly_energy_kwh: 215000, total_energy_mwh: 5680.3, device_count: 45, efficiency: 96 },
  { id: '5', name: 'Central Solar Bahia', location: 'Salvador, BA', latitude: -12.9714, longitude: -38.5124, capacity_kwp: 350, installation_date: '2024-01-20', status: 'offline', current_power_kw: 0, today_energy_kwh: 890.2, monthly_energy_kwh: 32100, total_energy_mwh: 185.4, device_count: 8, efficiency: 0 },
  { id: '6', name: 'Usina Solar Curitiba', location: 'Curitiba, PR', latitude: -25.4284, longitude: -49.2733, capacity_kwp: 600, installation_date: '2023-09-12', status: 'online', current_power_kw: 410.5, today_energy_kwh: 2680.3, monthly_energy_kwh: 61200, total_energy_mwh: 520.1, device_count: 14, efficiency: 88 },
];

export const devices: Device[] = [
  { id: 'd1', plant_id: '1', plant_name: 'Usina Solar Campinas I', manufacturer: 'Huawei', model: 'SUN2000-60KTL-M0', serial_number: 'HW2023001', device_type: 'inverter', status: 'online', power_kw: 58.3, temperature: 42, last_communication: '2026-03-08T14:30:00' },
  { id: 'd2', plant_id: '1', plant_name: 'Usina Solar Campinas I', manufacturer: 'Huawei', model: 'SUN2000-60KTL-M0', serial_number: 'HW2023002', device_type: 'inverter', status: 'online', power_kw: 55.8, temperature: 40, last_communication: '2026-03-08T14:30:00' },
  { id: 'd3', plant_id: '2', plant_name: 'Solar Park Ribeirão', manufacturer: 'SolarEdge', model: 'SE100K', serial_number: 'SE2022001', device_type: 'inverter', status: 'online', power_kw: 95.2, temperature: 38, last_communication: '2026-03-08T14:28:00' },
  { id: 'd4', plant_id: '2', plant_name: 'Solar Park Ribeirão', manufacturer: 'SolarEdge', model: 'SE100K', serial_number: 'SE2022002', device_type: 'inverter', status: 'online', power_kw: 92.7, temperature: 39, last_communication: '2026-03-08T14:28:00' },
  { id: 'd5', plant_id: '3', plant_name: 'Fazenda Solar MG', manufacturer: 'Growatt', model: 'MAX 80KTL3-LV', serial_number: 'GR2023001', device_type: 'inverter', status: 'warning', power_kw: 45.1, temperature: 58, last_communication: '2026-03-08T14:25:00' },
  { id: 'd6', plant_id: '4', plant_name: 'Parque Fotovoltaico Goiás', manufacturer: 'Fronius', model: 'Symo 20.0-3-M', serial_number: 'FR2022001', device_type: 'inverter', status: 'online', power_kw: 19.5, temperature: 35, last_communication: '2026-03-08T14:30:00' },
  { id: 'd7', plant_id: '5', plant_name: 'Central Solar Bahia', manufacturer: 'GoodWe', model: 'GW50K-ET', serial_number: 'GW2024001', device_type: 'inverter', status: 'offline', power_kw: 0, temperature: 28, last_communication: '2026-03-08T10:15:00' },
  { id: 'd8', plant_id: '1', plant_name: 'Usina Solar Campinas I', manufacturer: 'Huawei', model: 'SmartLogger3000A', serial_number: 'HW-DL001', device_type: 'datalogger', status: 'online', power_kw: 0, temperature: 32, last_communication: '2026-03-08T14:30:00' },
  { id: 'd9', plant_id: '6', plant_name: 'Usina Solar Curitiba', manufacturer: 'SMA', model: 'Sunny Tripower 25000TL', serial_number: 'SMA2023001', device_type: 'inverter', status: 'online', power_kw: 22.8, temperature: 36, last_communication: '2026-03-08T14:29:00' },
  { id: 'd10', plant_id: '3', plant_name: 'Fazenda Solar MG', manufacturer: 'Growatt', model: 'ShineWiFi-X', serial_number: 'GR-GW001', device_type: 'gateway', status: 'online', power_kw: 0, temperature: 30, last_communication: '2026-03-08T14:30:00' },
];

export const alerts: Alert[] = [
  { id: 'a1', plant_id: '5', plant_name: 'Central Solar Bahia', device_id: 'd7', type: 'critical', message: 'Inversor offline — sem comunicação há 4 horas', timestamp: '2026-03-08T10:15:00', resolved: false },
  { id: 'a2', plant_id: '3', plant_name: 'Fazenda Solar MG', device_id: 'd5', type: 'warning', message: 'Temperatura do inversor acima do normal (58°C)', timestamp: '2026-03-08T13:45:00', resolved: false },
  { id: 'a3', plant_id: '3', plant_name: 'Fazenda Solar MG', device_id: 'd5', type: 'warning', message: 'Geração 22% abaixo do esperado', timestamp: '2026-03-08T12:00:00', resolved: false },
  { id: 'a4', plant_id: '1', plant_name: 'Usina Solar Campinas I', device_id: 'd1', type: 'info', message: 'Atualização de firmware disponível', timestamp: '2026-03-08T09:00:00', resolved: false },
  { id: 'a5', plant_id: '2', plant_name: 'Solar Park Ribeirão', device_id: 'd3', type: 'info', message: 'Manutenção preventiva agendada para 15/03', timestamp: '2026-03-07T16:00:00', resolved: true },
  { id: 'a6', plant_id: '4', plant_name: 'Parque Fotovoltaico Goiás', device_id: 'd6', type: 'warning', message: 'Queda momentânea de tensão detectada', timestamp: '2026-03-08T11:30:00', resolved: true },
];

export const hourlyData: EnergyDataPoint[] = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const sunFactor = hour >= 6 && hour <= 18 ? Math.sin(((hour - 6) / 12) * Math.PI) : 0;
  return {
    time: `${String(hour).padStart(2, '0')}:00`,
    generation: Math.round(sunFactor * 3800 * (0.85 + Math.random() * 0.15)),
    consumption: Math.round(1200 + Math.random() * 800 + (hour >= 8 && hour <= 18 ? 600 : 0)),
  };
});

export const dailyData: EnergyDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  time: `${String(i + 1).padStart(2, '0')}/03`,
  generation: Math.round(18000 + Math.random() * 6000),
  consumption: Math.round(12000 + Math.random() * 4000),
}));

export const monthlyData: EnergyDataPoint[] = [
  { time: 'Set', generation: 480000, consumption: 320000 },
  { time: 'Out', generation: 520000, consumption: 340000 },
  { time: 'Nov', generation: 560000, consumption: 350000 },
  { time: 'Dez', generation: 590000, consumption: 360000 },
  { time: 'Jan', generation: 610000, consumption: 370000 },
  { time: 'Fev', generation: 550000, consumption: 345000 },
  { time: 'Mar', generation: 567200, consumption: 352000 },
];

// Summary stats
export const platformStats = {
  totalPlants: plants.length,
  totalDevices: devices.length,
  plantsOnline: plants.filter(p => p.status === 'online').length,
  plantsOffline: plants.filter(p => p.status === 'offline').length,
  plantsWarning: plants.filter(p => p.status === 'warning').length,
  currentPowerKw: plants.reduce((sum, p) => sum + p.current_power_kw, 0),
  todayEnergyKwh: plants.reduce((sum, p) => sum + p.today_energy_kwh, 0),
  monthlyEnergyKwh: plants.reduce((sum, p) => sum + p.monthly_energy_kwh, 0),
  totalEnergyMwh: plants.reduce((sum, p) => sum + p.total_energy_mwh, 0),
  totalCapacityKwp: plants.reduce((sum, p) => sum + p.capacity_kwp, 0),
  activeAlerts: alerts.filter(a => !a.resolved).length,
  co2SavedTons: plants.reduce((sum, p) => sum + p.total_energy_mwh, 0) * 0.42,
};
