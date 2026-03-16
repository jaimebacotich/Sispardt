import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { PersonalView } from "@/components/personal/personal-view";

export const metadata = { title: "Personal del Establecimiento" };

export default async function PersonalEstablecimientoPage({
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
          title="Personal del Establecimiento"
          subtitle="Gestión del equipo de trabajo registrado"
          className="mb-0 flex-1"
        />
      </div>
      <PersonalView establecimientoId={id} />
    </div>
  );
}
