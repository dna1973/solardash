import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "primary" | "warning" | "danger";
}

const variantStyles = {
  default: "bg-card shadow-card",
  primary: "bg-card shadow-card border-l-4 border-l-primary",
  warning: "bg-card shadow-card border-l-4 border-l-energy-yellow",
  danger: "bg-card shadow-card border-l-4 border-l-destructive",
};

const iconBg = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-energy-green-light text-primary",
  warning: "bg-energy-yellow-light text-energy-yellow",
  danger: "bg-energy-red-light text-destructive",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-5 transition-shadow hover:shadow-card-hover ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-medium ${trend.positive ? 'text-primary' : 'text-destructive'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
