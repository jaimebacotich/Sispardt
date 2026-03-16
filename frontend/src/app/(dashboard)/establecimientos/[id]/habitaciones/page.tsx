import { PageHeader } from "@/components/shared";
import { HabitacionesSplitPanel } from "@/components/registro/habitaciones-split-panel";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Gestión de Habitaciones" };

export default async function HabitacionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/establecimientos"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <PageHeader
          title="Gestión de Habitaciones"
          subtitle="Configuración de habitaciones y camas del establecimiento"
          className="mb-0 flex-1"
        />
      </div>
      <HabitacionesSplitPanel establecimientoId={id} />
    </div>
  );
}
