import { PageHeader } from "@/components/shared";
import { EstadisticasDashboard } from "@/components/estadisticas/estadisticas-dashboard";
import { EstadisticasActions } from "@/components/estadisticas/estadisticas-actions";

export const metadata = { title: "Estadísticas Generales" };

export default function EstadisticasPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Estadísticas Generales"
        subtitle="Análisis de ocupación, visitantes y rendimiento hotelero"
      >
        <EstadisticasActions />
      </PageHeader>
      <EstadisticasDashboard />
    </div>
  );
}
