import { cn } from "@/lib/utils";
import type { EstadoHabitacion } from "@/types/api";

type Status = EstadoHabitacion | "activo" | "anulado" | "pendiente";

const CONFIG: Record<Status, { label: string; className: string; dot: string }> = {
  libre: {
    label: "Libre",
    className: "bg-status-libre/15 text-status-libre border border-status-libre/30",
    dot: "bg-status-libre",
  },
  ocupada: {
    label: "Ocupada",
    className: "bg-status-ocupada/15 text-status-ocupada border border-status-ocupada/30",
    dot: "bg-status-ocupada",
  },
  mantenimiento: {
    label: "Mantenimiento",
    className: "bg-status-mantenimiento/15 text-status-mantenimiento border border-status-mantenimiento/30",
    dot: "bg-status-mantenimiento",
  },
  activo: {
    label: "Activo",
    className: "bg-status-libre/15 text-status-libre border border-status-libre/30",
    dot: "bg-status-libre",
  },
  anulado: {
    label: "Anulado",
    className: "bg-status-ocupada/15 text-status-ocupada border border-status-ocupada/30",
    dot: "bg-status-ocupada",
  },
  pendiente: {
    label: "Pendiente",
    className: "bg-status-pendiente/15 text-status-pendiente border border-status-pendiente/30",
    dot: "bg-status-pendiente",
  },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        cfg.className,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
