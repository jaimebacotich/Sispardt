import { PageHeader } from "@/components/shared";
import { HabitacionesGrid } from "@/components/recepcionista/habitaciones-grid";

export const metadata = { title: "Estado de Habitaciones" };

export default function EstadoHabitacionesPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Estado de Habitaciones"
        subtitle="Vista en tiempo real de la ocupación del establecimiento"
      />
      <HabitacionesGrid />
    </div>
  );
}
