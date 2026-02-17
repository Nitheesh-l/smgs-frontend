import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

const GlassCard = ({ children, className, hover = false }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-6",
        hover && "interactive-card",
        className
      )}
    >
      {children}
    </div>
  );
};

export default GlassCard;
