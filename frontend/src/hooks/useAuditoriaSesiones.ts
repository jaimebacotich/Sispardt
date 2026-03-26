"use client";

import { useQuery } from "@tanstack/react-query";
import { auditoriaSesionesApi, type SesionesParams } from "@/lib/api/auditoria-sesiones";
import { useAuth } from "./useAuth";

const QUERY_KEYS = {
  sesiones:   (params: object) => ["auditoria-sesiones", params] as const,
  conectados: (params: object) => ["usuarios-conectados", params]  as const,
};

export function useAuditoriaSesiones(params?: SesionesParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.sesiones(params ?? {}),
    queryFn:  () => auditoriaSesionesApi.listSesiones(accessToken!, params),
    enabled:  !!accessToken,
    staleTime: 0,
  });
}

export function useUsuariosConectados(
  params?: { username?: string; rol?: string; clientId?: string }
) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey:           QUERY_KEYS.conectados(params ?? {}),
    queryFn:            () => auditoriaSesionesApi.getConectados(accessToken!, params),
    enabled:            !!accessToken,
    refetchInterval:    30_000, // auto-refresh cada 30 s
    staleTime:          0,
  });
}
