import { Badge } from "@/components/ui/badge";

const statusConfig = {
  online: { label: "Online", className: "bg-energy-green-light text-primary border-primary/20" },
  offline: { label: "Offline", className: "bg-energy-red-light text-destructive border-destructive/20" },
  warning: { label: "Alerta", className: "bg-energy-yellow-light text-energy-orange border-energy-yellow/30" },
  maintenance: { label: "Manutenção", className: "bg-energy-blue-light text-energy-blue border-energy-blue/20" },
};

export function PlantStatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${config.className}`}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </Badge>
  );
}
