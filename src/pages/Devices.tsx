import { devices } from "@/data/mockData";
import { PlantStatusBadge } from "@/components/PlantStatusBadge";
import { Cpu } from "lucide-react";
import { motion } from "framer-motion";

const deviceTypeLabels: Record<string, string> = {
  inverter: "Inversor",
  meter: "Medidor",
  datalogger: "Datalogger",
  gateway: "Gateway",
  sensor: "Sensor",
};

export default function Devices() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipamentos</h1>
          <p className="text-sm text-muted-foreground">{devices.length} dispositivos registrados</p>
        </div>
        <button className="gradient-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          + Novo Equipamento
        </button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">Equipamento</th>
                <th className="text-left py-3 px-4 font-medium">Usina</th>
                <th className="text-left py-3 px-4 font-medium">Fabricante</th>
                <th className="text-left py-3 px-4 font-medium">Tipo</th>
                <th className="text-right py-3 px-4 font-medium">Potência</th>
                <th className="text-right py-3 px-4 font-medium">Temp.</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{device.model}</p>
                        <p className="text-xs text-muted-foreground font-mono">{device.serial_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{device.plant_name}</td>
                  <td className="py-3 px-4 font-medium">{device.manufacturer}</td>
                  <td className="py-3 px-4 text-muted-foreground">{deviceTypeLabels[device.device_type]}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">{device.power_kw > 0 ? `${device.power_kw} kW` : '—'}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs">{device.temperature}°C</td>
                  <td className="py-3 px-4 text-center"><PlantStatusBadge status={device.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
