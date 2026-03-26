import { apiClient } from "@/lib/api-client";
import type {
  UsuarioSistema,
  UsuarioSistemaCreadoResponse,
  UsuarioSistemaCreate,
  UsuarioSistemaUpdate,
  RolSistema,
  PagedResult,
} from "@/types/api";

export const usuariosSistemaApi = {
  list: (
    token: string,
    params?: { page?: number; pageSize?: number; search?: string; estado?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("page_size", String(params.pageSize));
    if (params?.search) q.set("search", params.search);
    if (params?.estado) q.set("estado", params.estado);
    return apiClient.get<PagedResult<UsuarioSistema>>(
      `/api/v1/usuarios-sistema?${q}`,
      token
    );
  },

  getById: (token: string, id: string) =>
    apiClient.get<UsuarioSistema>(`/api/v1/usuarios-sistema/${id}`, token),

  create: (token: string, data: UsuarioSistemaCreate) =>
    apiClient.post<UsuarioSistemaCreadoResponse>(
      "/api/v1/usuarios-sistema",
      data,
      token
    ),

  update: (token: string, id: string, data: UsuarioSistemaUpdate) =>
    apiClient.put<UsuarioSistema>(`/api/v1/usuarios-sistema/${id}`, data, token),

  cambiarRol: (token: string, id: string, rolNombre: string) =>
    apiClient.patch<UsuarioSistema>(
      `/api/v1/usuarios-sistema/${id}/rol`,
      { rol_nombre: rolNombre },
      token
    ),

  delete: (token: string, id: string) =>
    apiClient.delete<void>(`/api/v1/usuarios-sistema/${id}`, token),

  listRoles: (token: string) =>
    apiClient.get<RolSistema[]>("/api/v1/usuarios-sistema/roles", token),
};
