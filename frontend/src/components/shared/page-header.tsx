import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // botones de acción
  className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">{children}</div>
      )}
    </div>
  );
}
