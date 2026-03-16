import { apiClient } from "@/lib/api-client";
import type { PagedResult, SesionAuditoria, ConectadosResponse } from "@/types/api";

export interface SesionesParams {
  page?: number;
  pageSize?: number;
  tipo?: string;
  username?: string;
  rol?: string;
  ip?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export const auditoriaSesionesApi = {
  listSesiones: (token: string, params?: SesionesParams) => {
    const q = new URLSearchParams();
    if (params?.page)       q.set("page",        String(params.page));
    if (params?.pageSize)   q.set("page_size",   String(params.pageSize));
    if (params?.tipo)       q.set("tipo",         params.tipo);
    if (params?.username)   q.set("username",     params.username);
    if (params?.rol)        q.set("rol",          params.rol);
    if (params?.ip)         q.set("ip",           params.ip);
    if (params?.fechaDesde) q.set("fecha_desde",  params.fechaDesde);
    if (params?.fechaHasta) q.set("fecha_hasta",  params.fechaHasta);
    return apiClient.get<PagedResult<SesionAuditoria>>(
      `/api/v1/auditoria-sesiones?${q}`,
      token
    );
  },

  getConectados: (
    token: string,
    params?: { username?: string; rol?: string; clientId?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.username) q.set("username",  params.username);
    if (params?.rol)      q.set("rol",       params.rol);
    if (params?.clientId) q.set("client_id", params.clientId);
    const qs = q.toString();
    return apiClient.get<ConectadosResponse>(
      `/api/v1/auditoria-sesiones/conectados${qs ? `?${qs}` : ""}`,
      token
    );
  },
};
