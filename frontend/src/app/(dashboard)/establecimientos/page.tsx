import { PageHeader } from "@/components/shared";
import { EstablecimientosList } from "@/components/registro/establecimientos-list";
import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata = { title: "Establecimientos" };

export default function EstablecimientosPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Establecimientos"
        subtitle="Gestión de establecimientos hoteleros"
      >
        <Link
          href="/establecimientos/nuevo"
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nuevo Establecimiento
        </Link>
      </PageHeader>
      <EstablecimientosList />
    </div>
  );
}
