import { PageHeader } from "@/components/shared";
import { Users } from "lucide-react";

export const metadata = { title: "Personal" };

export default function PersonalPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Personal"
        subtitle="Gestión del personal del establecimiento"
      />
      <div className="flex flex-col items-center justify-center h-64 bg-card rounded-xl border border-border text-muted-foreground gap-3">
        <Users size={40} className="opacity-30" />
        <p className="text-sm">Módulo en desarrollo</p>
      </div>
    </div>
  );
}
