import { cn } from "@/lib/utils";
import type { AuditAccion } from "@/types/api";

interface ActionBadgeProps {
  action: AuditAccion;
  className?: string;
}

const CONFIG: Record<
  AuditAccion,
  { label: string; className: string }
> = {
  INSERT: {
    label: "INSERT",
    className:
      "bg-status-libre/15 text-status-libre border border-status-libre/30",
  },
  UPDATE: {
    label: "UPDATE",
    className:
      "bg-status-pendiente/15 text-status-pendiente border border-status-pendiente/30",
  },
  DELETE: {
    label: "DELETE",
    className:
      "bg-status-ocupada/15 text-status-ocupada border border-status-ocupada/30",
  },
};

export function ActionBadge({ action, className }: ActionBadgeProps) {
  const cfg = CONFIG[action];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono",
        cfg.className,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}
