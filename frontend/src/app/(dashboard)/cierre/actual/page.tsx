import { PageHeader } from "@/components/shared";
import { CierreActualClient } from "./cierre-actual-client";

export const metadata = { title: "Cierre Actual — SISPARDT" };

export default function CierreActualPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Cierre Actual"
        subtitle="Cierre del parte diario de la fecha anterior"
      />
      <CierreActualClient />
    </div>
  );
}
