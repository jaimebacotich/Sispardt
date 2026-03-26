"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEstablecimientoActual } from "@/hooks/useEstablecimientoActual";
import { cn } from "@/lib/utils";

// Mapa de rutas a títulos de página
const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/habitaciones/estado": "Estado de Habitaciones",
  "/partes": "Partes Diarios",
  "/partes/nuevo": "Nuevo Parte Diario",
  "/cierre": "Cierre Diario",
  "/establecimientos": "Establecimientos",
  "/establecimientos/nuevo": "Nuevo Establecimiento",
  "/personal": "Personal",
  "/catalogos": "Catálogos",
  "/estadisticas/general": "Estadísticas Generales",
  "/estadisticas/comparativa": "Comparativa",
  "/estadisticas/reportes": "Reportes",
  "/auditoria": "Auditoría Transaccional",
};

function getPageTitle(pathname: string): string {
  // Buscar coincidencia exacta primero
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Buscar por prefijo
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(route) && route !== "/dashboard") return title;
  }
  return "SISPARDT";
}

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useAuth();
  const { nombre: establecimientoNombre } = useEstablecimientoActual();
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const rawTitle = getPageTitle(pathname);
  const title = rawTitle === "SISPARDT"
    ? (establecimientoNombre ?? "Dirección Dptal. de Turismo Tarija")
    : rawTitle;

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      {/* Título de página */}
      <h1 className="text-base font-semibold text-foreground">{title}</h1>

      {/* Acciones del header */}
      <div className="flex items-center gap-3">
        {/* Indicador online/offline */}
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            isOnline ? "text-status-libre" : "text-status-ocupada"
          )}
          title={isOnline ? "Conectado" : "Sin conexión"}
        >
          {isOnline ? (
            <Wifi size={14} className="text-status-libre" />
          ) : (
            <WifiOff size={14} className="text-status-ocupada" />
          )}
          <span className="hidden sm:inline">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Separador */}
        <div className="w-px h-5 bg-border" />

        {/* Nombre usuario */}
        {user && (
          <span className="text-sm text-muted-foreground hidden md:block">
            {user.fullName || user.username}
          </span>
        )}

        {/* Dark mode toggle */}
        {mounted && (
          <button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Cambiar tema"
          >
            {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
      </div>
    </header>
  );
}
