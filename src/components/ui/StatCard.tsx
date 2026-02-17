import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: "default" | "primary" | "accent" | "success" | "warning";
}

const StatCard = ({ title, value, icon, trend, className, variant = "default" }: StatCardProps) => {
  const variantStyles = {
    default: "border-border",
    primary: "border-primary/20 bg-primary/5",
    accent: "border-accent/20 bg-accent/5",
    success: "border-success/20 bg-success/5",
    warning: "border-warning/20 bg-warning/5",
  };

  const iconVariants = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <div
      className={cn(
        "stat-card border",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-sm mt-2",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconVariants[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
