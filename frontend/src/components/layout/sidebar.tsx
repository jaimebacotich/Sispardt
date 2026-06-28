"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import {
  Building2,
  BedDouble,
  BookOpen,
  BarChart3,
  ClipboardList,
  LogOut,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Hotel,
  FileWarning,
  CalendarCheck,
  AlertTriangle,
  FlaskConical,
  Wifi,
  History,
  Users,
  Printer,
  FileBarChart2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { Role } from "@/types/auth";
import { useEstablecimientoActual } from "@/hooks/useEstablecimientoActual";
import { useFechasPendientes } from "@/hooks/useMovimientos";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_API === "true";
const STORAGE_KEY = "sispardt-sidebar-collapsed";

const ALL_ROLES: { value: Role; label: string }[] = [
  { value: "recepcionista",          label: "Recepcionista" },
  { value: "responsable_registro",   label: "Resp. Registro" },
  { value: "admin_general",          label: "Admin General" },
  { value: "tecnico_registro",       label: "Técnico Registro" },
  { value: "responsable_estadistica",label: "Resp. Estadística" },
];

function MockRoleSwitcher({ collapsed }: { collapsed: boolean }) {
  const current =
    typeof window !== "undefined"
      ? (localStorage.getItem("mock_role") as Role) || "recepcionista"
      : "recepcionista";

  function switchRole(role: Role) {
    localStorage.setItem("mock_role", role);
    window.location.reload();
  }

  if (collapsed) return null;

  return (
    <div className="border-t border-sidebar-border px-3 py-3">
      <div className="flex items-center gap-1.5 text-xs text-amber-400/80 mb-2 px-1">
        <FlaskConical size={12} />
        <span className="font-medium">Mock Role</span>
      </div>
      <div className="space-y-0.5">
        {ALL_ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => switchRole(r.value)}
            className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
              current === r.value
                ? "bg-amber-500/20 text-amber-300 font-medium"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tooltip simple ──────────────────────────────────────────────────────────
function Tooltip({ children, label, show }: { children: React.ReactNode; label: string; show: boolean }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!show) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 px-2.5 py-1.5 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
}

// ── Tipos ────────────────────────────────────────────────────────────────────
interface NavLeaf {
  type?: "leaf";
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
  badge?: number;
}

interface NavGroup {
  type: "group";
  label: string;
  icon: React.ElementType;
  roles: Role[];
  children: { label: string; href: string; icon: React.ElementType }[];
}

type NavEntry = NavLeaf | NavGroup;

// ── Árbol de navegación ──────────────────────────────────────────────────────
const NAV_ENTRIES: NavEntry[] = [
  {
    label: "Check-in / Check-out",
    href: "/partes",
    icon: ClipboardList,
    roles: ["recepcionista"],
  },
  {
    label: "Estado Habitaciones",
    href: "/habitaciones/estado",
    icon: Hotel,
    roles: ["recepcionista"],
  },
  {
    label: "Registros Fuera de Plazo",
    href: "/reporte/fuera-de-plazo",
    icon: FileWarning,
    roles: ["recepcionista"],
  },
  {
    type: "group",
    label: "Cierre de Partes",
    icon: CalendarCheck,
    roles: ["recepcionista"],
    children: [
      { label: "Cierre Actual",       href: "/cierre/actual",          icon: CalendarCheck },
      { label: "Fuera de Plazo",      href: "/cierre/fuera-de-plazo",  icon: AlertTriangle },
    ],
  },
  {
    label: "Impresión de Partes",
    href: "/partes/imprimir",
    icon: Printer,
    roles: ["recepcionista"],
  },
  {
    label: "Establecimientos",
    href: "/establecimientos",
    icon: Building2,
    roles: ["responsable_registro", "tecnico_registro"],
  },
  {
    label: "Catálogos",
    href: "/catalogos",
    icon: BookOpen,
    roles: ["responsable_registro"],
  },
  {
    label: "Estadísticas",
    href: "/estadisticas/general",
    icon: BarChart3,
    roles: ["responsable_registro"],
  },
  {
    label: "Reportes",
    href: "/reportes",
    icon: FileBarChart2,
    roles: ["responsable_registro"],
  },
  {
    label: "Auditoría de Datos",
    href: "/auditoria",
    icon: ShieldCheck,
    roles: ["admin_general"],
  },
  {
    label: "Auditoría de Sesiones",
    href: "/auditoria-sesiones",
    icon: History,
    roles: ["admin_general"],
  },
  {
    label: "Usuarios Conectados",
    href: "/usuarios-conectados",
    icon: Wifi,
    roles: ["admin_general"],
  },
  {
    label: "Gestión de Usuarios",
    href: "/usuarios-sistema",
    icon: Users,
    roles: ["admin_general"],
  },
];

const ROLE_LABELS: Record<Role, string> = {
  admin_general:           "Administrador General",
  responsable_registro:    "Resp. Registro",
  tecnico_registro:        "Técnico Registro",
  responsable_estadistica: "Resp. Estadística",
  recepcionista:           "Recepcionista",
  estadistica_externa:     "Estadística Externa",
  migraciones:             "Migraciones",
};

// ── Componente hoja ──────────────────────────────────────────────────────────
function NavLeafItem({ item, pathname, badge, collapsed }: { item: NavLeaf; pathname: string; badge?: number; collapsed: boolean }) {
  const Icon = item.icon;
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Tooltip label={item.label} show={collapsed}>
      <Link
        href={item.href}
        className={cn(
          "flex items-center rounded-lg text-sm font-medium transition-colors duration-100 group",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon
          className={cn(
            "flex-shrink-0",
            isActive
              ? "text-sidebar-primary-foreground"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
          )}
          size={18}
        />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {badge && badge > 0 && (
              <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-status-mantenimiento text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
            {!badge && isActive && <ChevronRight size={14} className="opacity-60" />}
          </>
        )}
        {collapsed && badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-status-mantenimiento text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {badge > 99 ? "+" : badge}
          </span>
        )}
      </Link>
    </Tooltip>
  );
}

// ── Componente grupo (con submenu) ───────────────────────────────────────────
function NavGroupItem({ item, pathname, collapsed }: { item: NavGroup; pathname: string; collapsed: boolean }) {
  const isChildActive = item.children.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isChildActive);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const Icon = item.icon;

  if (collapsed) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setPopoverVisible(true)}
        onMouseLeave={() => setPopoverVisible(false)}
      >
        <div
          className={cn(
            "flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100 group cursor-pointer",
            isChildActive
              ? "bg-sidebar-primary/20 text-sidebar-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Icon
            className={cn(
              "flex-shrink-0",
              isChildActive
                ? "text-sidebar-foreground"
                : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
            )}
            size={18}
          />
        </div>
        {popoverVisible && (
          <div className="absolute left-full top-0 ml-2 z-50 bg-sidebar border border-sidebar-border rounded-lg shadow-xl py-1.5 min-w-[160px]">
            <div className="px-3 py-1.5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wide">
              {item.label}
            </div>
            {item.children.map((child) => {
              const ChildIcon = child.icon;
              const isActive = pathname.startsWith(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors duration-100",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <ChildIcon size={14} className="flex-shrink-0" />
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100 group",
          isChildActive
            ? "bg-sidebar-primary/20 text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon
          className={cn(
            "flex-shrink-0",
            isChildActive
              ? "text-sidebar-foreground"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
          )}
          size={18}
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
        {open
          ? <ChevronDown size={14} className="opacity-60" />
          : <ChevronRight size={14} className="opacity-60" />
        }
      </button>

      {open && (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const isActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors duration-100",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <ChildIcon size={14} className="flex-shrink-0" />
                <span className="truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sidebar principal ────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const { user, roles, isLoading } = useAuth();
  const { nombre: establecimientoNombre } = useEstablecimientoActual();
  const esRecepcionista = roles.includes("recepcionista");
  const { data: pendientesFuera = [] } = useFechasPendientes();
  const badgeFueraPlazo = esRecepcionista ? pendientesFuera.length : 0;

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  const visible = NAV_ENTRIES.filter((entry) =>
    entry.roles.length === 0 || entry.roles.some((r) => roles.includes(r))
  );

  const primaryRole = roles[0];

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar flex flex-col border-r border-sidebar-border select-none transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border",
        collapsed ? "justify-center px-2 py-5" : "gap-3 px-5 py-5"
      )}>
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <BedDouble className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sidebar-foreground font-bold text-sm leading-tight">
              SISPARDT
            </div>
            <div className="text-sidebar-foreground/50 text-xs truncate max-w-[140px]" title={establecimientoNombre ?? "Dir. Dptal. Turismo Tarija"}>
              {establecimientoNombre ?? "Dir. Dptal. Turismo Tarija"}
            </div>
          </div>
        )}
      </div>

      {/* Navegación */}
      <nav className={cn(
        "flex-1 py-4 space-y-0.5",
        collapsed ? "px-2 overflow-visible" : "px-3 overflow-y-auto"
      )}>
        {visible.map((entry) => {
          if (entry.type === "group") {
            return (
              <NavGroupItem key={entry.label} item={entry} pathname={pathname} collapsed={collapsed} />
            );
          }
          return (
            <NavLeafItem
              key={entry.href}
              item={entry as NavLeaf}
              pathname={pathname}
              badge={entry.href === "/reporte/fuera-de-plazo" ? badgeFueraPlazo : undefined}
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      {/* Dev: selector de rol mock */}
      {IS_MOCK && <MockRoleSwitcher collapsed={collapsed} />}

      {/* Usuario */}
      <div className={cn(
        "border-t border-sidebar-border",
        collapsed ? "px-2 py-3" : "px-4 py-4"
      )}>
        {!isLoading && user && !collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-xs font-bold uppercase">
                {user.fullName?.charAt(0) ?? user.username?.charAt(0) ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sidebar-foreground text-xs font-medium truncate">
                {user.fullName || user.username}
              </div>
              <div className="text-sidebar-foreground/50 text-xs truncate">
                {primaryRole ? ROLE_LABELS[primaryRole] : "—"}
              </div>
            </div>
          </div>
        )}
        {!isLoading && user && collapsed && (
          <Tooltip label={user.fullName || user.username || ""} show>
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-xs font-bold uppercase">
                  {user.fullName?.charAt(0) ?? user.username?.charAt(0) ?? "U"}
                </span>
              </div>
            </div>
          </Tooltip>
        )}
        <Tooltip label="Cerrar Sesión" show={collapsed}>
          <button
            onClick={async () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const session = await import("next-auth/react").then(m => m.getSession()) as any;
              const idToken = session?.idToken as string | undefined;
              await signOut({ redirect: false });
              const kcPort = process.env.NEXT_PUBLIC_KC_PORT ?? "8080";
              const keycloakIssuer = `${window.location.protocol}//${window.location.hostname}:${kcPort}/realms/sispardt`;
              const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
              const hint = idToken ? `&id_token_hint=${encodeURIComponent(idToken)}` : "";
              window.location.href = `${keycloakIssuer}/protocol/openid-connect/logout?post_logout_redirect_uri=${redirectUri}${hint}`;
            }}
            className={cn(
              "w-full flex items-center text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs py-1.5 rounded hover:bg-sidebar-accent transition-colors",
              collapsed ? "justify-center px-2" : "gap-2 px-2"
            )}
          >
            <LogOut size={14} />
            {!collapsed && "Cerrar Sesión"}
          </button>
        </Tooltip>
      </div>

      {/* Botón toggle colapsar */}
      <div className={cn(
        "border-t border-sidebar-border",
        collapsed ? "px-2 py-2" : "px-3 py-2"
      )}>
        <Tooltip label="Expandir menú" show={collapsed}>
          <button
            onClick={toggleCollapsed}
            className={cn(
              "w-full flex items-center text-sidebar-foreground/40 hover:text-sidebar-foreground text-xs py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors",
              collapsed ? "justify-center px-2" : "gap-2 px-2"
            )}
          >
            {collapsed
              ? <PanelLeftOpen size={16} />
              : <><PanelLeftClose size={16} /><span>Colapsar</span></>
            }
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
