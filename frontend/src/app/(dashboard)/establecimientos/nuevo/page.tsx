import { PageHeader } from "@/components/shared";
import { EstablecimientoFormWrapper } from "@/components/registro/establecimiento-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Nuevo Establecimiento" };

export default function NuevoEstablecimientoPage() {
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
          title="Nuevo Establecimiento"
          subtitle="Registra un nuevo establecimiento hotelero en el sistema"
          className="mb-0 flex-1"
        />
      </div>
      <EstablecimientoFormWrapper mode="create" />
    </div>
  );
}
