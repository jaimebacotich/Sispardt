import { BedDouble } from "lucide-react";

export const metadata = { title: "SISPARDT" };

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 select-none">
      <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-md">
        <BedDouble className="w-9 h-9 text-primary-foreground" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          SISPARDT
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sistema de Partes Diarios Tarija
        </p>
      </div>
    </div>
  );
}
