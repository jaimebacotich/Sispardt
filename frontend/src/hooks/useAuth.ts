"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import type { Role } from "@/types/auth";

const USE_MOCK = process.env.NEXT_PUBLIC_MOCK_API === "true";

const MOCK_USERS: Record<Role, {
  sub: string; username: string; fullName: string; email: string;
  roles: Role[]; establecimientoId: string | null; accessToken: string;
}> = {
  recepcionista: {
    sub: "00000000-0000-0000-0000-000000000001",
    username: "recep_demo",
    fullName: "Recepcionista Demo",
    email: "recepcionista@hoteldemo.com",
    roles: ["recepcionista"],
    establecimientoId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    accessToken: "mock-token",
  },
  responsable_registro: {
    sub: "00000000-0000-0000-0000-000000000002",
    username: "resp_registro_demo",
    fullName: "Resp. Registro Demo",
    email: "resp.registro@sispardt.gob.bo",
    roles: ["responsable_registro"],
    establecimientoId: null,
    accessToken: "mock-token",
  },
  admin_general: {
    sub: "00000000-0000-0000-0000-000000000003",
    username: "admin_demo",
    fullName: "Admin General Demo",
    email: "admin@sispardt.gob.bo",
    roles: ["admin_general"],
    establecimientoId: null,
    accessToken: "mock-token",
  },
  tecnico_registro: {
    sub: "00000000-0000-0000-0000-000000000004",
    username: "tecnico_demo",
    fullName: "Técnico Registro Demo",
    email: "tecnico@sispardt.gob.bo",
    roles: ["tecnico_registro"],
    establecimientoId: null,
    accessToken: "mock-token",
  },
  responsable_estadistica: {
    sub: "00000000-0000-0000-0000-000000000005",
    username: "estad_demo",
    fullName: "Resp. Estadística Demo",
    email: "estadistica@sispardt.gob.bo",
    roles: ["responsable_estadistica"],
    establecimientoId: null,
    accessToken: "mock-token",
  },
};

function getMockRole(): Role {
  if (typeof window === "undefined") return "recepcionista";
  return (localStorage.getItem("mock_role") as Role) || "recepcionista";
}

export function useAuth() {
  const { data: session, status } = useSession();

  // Always call hooks unconditionally (Rules of Hooks)
  const [mockRole, setMockRole] = useState<Role>("recepcionista");
  useEffect(() => {
    if (USE_MOCK) setMockRole(getMockRole());
  }, []);

  if (USE_MOCK) {
    const MOCK_USER = MOCK_USERS[mockRole] ?? MOCK_USERS.recepcionista;
    const isAdminGeneral       = mockRole === "admin_general";
    const isResponsableRegistro = mockRole === "responsable_registro";
    const isTecnicoRegistro    = mockRole === "tecnico_registro";
    const isRecepcionista      = mockRole === "recepcionista";
    const isResponsableEstadistica = mockRole === "responsable_estadistica";
    return {
      user: MOCK_USER,
      roles: MOCK_USER.roles,
      isLoading: false,
      isAuthenticated: true,
      hasRole: (...requiredRoles: Role[]) =>
        requiredRoles.some((r) => MOCK_USER.roles.includes(r)),
      isAdminGeneral,
      isResponsableRegistro,
      isTecnicoRegistro,
      isRecepcionista,
      isResponsableEstadistica,
      canManageEstablecimientos: isAdminGeneral || isResponsableRegistro || isTecnicoRegistro,
      canViewEstadisticas: isAdminGeneral || isResponsableEstadistica || isResponsableRegistro || isRecepcionista,
      canViewAuditoria: isAdminGeneral,
      canRegisterPartes: isRecepcionista,
      establecimientoId: MOCK_USER.establecimientoId,
      accessToken: MOCK_USER.accessToken,
    };
  }

  const user = session?.user ?? null;
  const roles: Role[] = user?.roles ?? [];
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !session?.error;

  function hasRole(...requiredRoles: Role[]): boolean {
    return requiredRoles.some((r) => roles.includes(r));
  }

  const isAdminGeneral = hasRole("admin_general");
  const isResponsableRegistro = hasRole("responsable_registro");
  const isTecnicoRegistro = hasRole("tecnico_registro");
  const isRecepcionista = hasRole("recepcionista");
  const isResponsableEstadistica = hasRole("responsable_estadistica");

  const canManageEstablecimientos =
    isAdminGeneral || isResponsableRegistro || isTecnicoRegistro;
  const canViewEstadisticas =
    isAdminGeneral || isResponsableEstadistica || isResponsableRegistro || isRecepcionista;
  const canViewAuditoria = isAdminGeneral;
  const canRegisterPartes = isRecepcionista;

  console.log("=== [useAuth] DEBUG START ===");
  console.log("Session User:", user);
  console.log("Roles del state:", roles);
  console.log("isAdminGeneral:", isAdminGeneral);
  console.log("isRecepcionista:", isRecepcionista);
  console.log("=== [useAuth] DEBUG END ===");

  return {
    user,
    roles,
    isLoading,
    isAuthenticated,
    hasRole,
    isAdminGeneral,
    isResponsableRegistro,
    isTecnicoRegistro,
    isRecepcionista,
    isResponsableEstadistica,
    canManageEstablecimientos,
    canViewEstadisticas,
    canViewAuditoria,
    canRegisterPartes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    establecimientoId: (session as any)?.establecimientoId ?? user?.establecimientoId ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accessToken: (session as any)?.accessToken ?? user?.accessToken ?? null,
  };
}
