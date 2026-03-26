import { cn, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: number; // porcentaje, positivo = subida, negativo = bajada
  suffix?: string;
  compact?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  trend,
  suffix,
  compact = false,
  className,
}: StatCardProps) {
  const formattedValue =
    typeof value === "number" ? formatNumber(value) : value;

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border shadow-sm flex items-start",
        compact ? "p-3 gap-2.5" : "p-5 gap-4",
        className
      )}
    >
      {/* Ícono */}
      <div
        className={cn(
          "rounded-lg flex items-center justify-center flex-shrink-0",
          compact ? "w-8 h-8" : "w-11 h-11 rounded-xl",
          iconBg
        )}
      >
        <Icon size={compact ? 16 : 22} className={iconColor} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-muted-foreground font-medium uppercase tracking-wide truncate",
          compact ? "text-[10px]" : "text-xs"
        )}>
          {label}
        </p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className={cn(
            "font-bold text-foreground leading-tight",
            compact ? "text-lg" : "text-2xl"
          )}>
            {formattedValue}
          </span>
          {suffix && (
            <span className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}>
              {suffix}
            </span>
          )}
        </div>

        {/* Tendencia */}
        {trend !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 font-medium mt-0.5",
              compact ? "text-[10px]" : "text-xs mt-1",
              trend > 0
                ? "text-status-libre"
                : trend < 0
                  ? "text-status-ocupada"
                  : "text-muted-foreground"
            )}
          >
            {trend > 0 ? (
              <TrendingUp size={10} />
            ) : trend < 0 ? (
              <TrendingDown size={10} />
            ) : (
              <Minus size={10} />
            )}
            <span>
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
