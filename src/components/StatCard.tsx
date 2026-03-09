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
      className={`rounded-xl p-3 md:p-5 transition-shadow hover:shadow-card-hover ${variantStyles[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-0.5 md:space-y-1 min-w-0">
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-lg md:text-2xl font-bold tracking-tight truncate">{value}</p>
          {subtitle && <p className="text-[10px] md:text-xs text-muted-foreground truncate">{subtitle}</p>}
          {trend && (
            <p className={`text-[10px] md:text-xs font-medium ${trend.positive ? 'text-primary' : 'text-destructive'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={`flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg shrink-0 ${iconBg[variant]}`}>
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
      </div>
    </motion.div>
  );
}
