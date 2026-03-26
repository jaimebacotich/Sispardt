import { PageHeader } from "@/components/shared";
import { CatalogosView } from "@/components/catalogos/catalogos-view";

export const metadata = { title: "Catálogos" };

export default function CatalogosPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Catálogos"
        subtitle="Gestión de catálogos y datos maestros del sistema"
      />
      <CatalogosView />
    </div>
  );
}
