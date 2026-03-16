import { PageHeader } from "@/components/shared";
import { EstablecimientoFormWrapper } from "@/components/registro/establecimiento-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Editar Establecimiento" };

export default async function EditarEstablecimientoPage({
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
          title="Editar Establecimiento"
          subtitle="Modifica los datos del establecimiento hotelero"
          className="mb-0 flex-1"
        />
      </div>
      <EstablecimientoFormWrapper mode="edit" id={id} />
    </div>
  );
}
