"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
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
} from "lucide-react";
import type { Role } from "@/types/auth";
import { useEstablecimientoActual } from "@/hooks/useEstablecimientoActual";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_API === "true";

const ALL_ROLES: { value: Role; label: string }[] = [
  { value: "recepcionista",          label: "Recepcionista" },
  { value: "responsable_registro",   label: "Resp. Registro" },
  { value: "admin_general",          label: "Admin General" },
  { value: "tecnico_registro",       label: "Técnico Registro" },
  { value: "responsable_estadistica",label: "Resp. Estadística" },
];

function MockRoleSwitcher() {
  const current =
    typeof window !== "undefined"
      ? (localStorage.getItem("mock_role") as Role) || "recepcionista"
      : "recepcionista";

  function switchRole(role: Role) {
    localStorage.setItem("mock_role", role);
    window.location.reload();
  }

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

// ── Tipos ────────────────────────────────────────────────────────────────────
interface NavLeaf {
  type?: "leaf";
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[];
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
  // ── Recepcionista ────────────────────────────────────────────────────────
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
    label: "Reporte Fuera de Plazo",
    href: "/reporte/fuera-de-plazo",
    icon: FileWarning,
    roles: ["recepcionista"],
  },
  // ── Responsable Registro ─────────────────────────────────────────────────
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
  // ── Estadísticas ─────────────────────────────────────────────────────────
  {
    label: "Estadísticas",
    href: "/estadisticas/general",
    icon: BarChart3,
    roles: ["responsable_registro"],
  },
  // ── Admin ────────────────────────────────────────────────────────────────
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
function NavLeafItem({ item, pathname }: { item: NavLeaf; pathname: string }) {
  const Icon = item.icon;
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100 group",
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
      <span className="flex-1 truncate">{item.label}</span>
      {isActive && <ChevronRight size={14} className="opacity-60" />}
    </Link>
  );
}

// ── Componente grupo (con submenu) ───────────────────────────────────────────
function NavGroupItem({ item, pathname }: { item: NavGroup; pathname: string }) {
  const isChildActive = item.children.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isChildActive);
  const Icon = item.icon;

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

  const visible = NAV_ENTRIES.filter((entry) =>
    entry.roles.length === 0 || entry.roles.some((r) => roles.includes(r))
  );

  const primaryRole = roles[0];

  return (
    <aside className="h-screen w-64 bg-sidebar flex flex-col border-r border-sidebar-border select-none">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <BedDouble className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sidebar-foreground font-bold text-sm leading-tight">
            SISPARDT
          </div>
          <div className="text-sidebar-foreground/50 text-xs truncate max-w-[140px]" title={establecimientoNombre ?? "Dir. Dptal. Turismo Tarija"}>
            {establecimientoNombre ?? "Dir. Dptal. Turismo Tarija"}
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visible.map((entry) => {
          if (entry.type === "group") {
            return (
              <NavGroupItem key={entry.label} item={entry} pathname={pathname} />
            );
          }
          return (
            <NavLeafItem key={entry.href} item={entry as NavLeaf} pathname={pathname} />
          );
        })}
      </nav>

      {/* Dev: selector de rol mock */}
      {IS_MOCK && <MockRoleSwitcher />}

      {/* Usuario */}
      <div className="border-t border-sidebar-border px-4 py-4">
        {!isLoading && user && (
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
          className="w-full flex items-center gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground text-xs py-1.5 px-2 rounded hover:bg-sidebar-accent transition-colors"
        >
          <LogOut size={14} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
