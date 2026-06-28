import { apiClient } from "@/lib/api-client";
import type {
  Establecimiento,
  EstablecimientoCreate,
  Habitacion,
  HabitacionCreate,
  Categoria,
  Localidad,
  TipoHabitacion,
  TipoCama,
  PagedResult,
  AuditoriaTransaccion,
} from "@/types/api";

export const establecimientosApi = {
  list: (
    token: string,
    params?: { page?: number; pageSize?: number; search?: string; categoriaId?: string; localidadId?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("page_size", String(params.pageSize));
    if (params?.search) q.set("search", params.search);
    if (params?.categoriaId) q.set("categoria_id", params.categoriaId);
    if (params?.localidadId) q.set("localidad_id", params.localidadId);
    return apiClient.get<PagedResult<Establecimiento>>(
      `/api/v1/establecimientos?${q}`,
      token
    );
  },

  getById: (token: string, id: string) =>
    apiClient.get<Establecimiento>(`/api/v1/establecimientos/${id}`, token),

  create: (token: string, data: EstablecimientoCreate) =>
    apiClient.post<Establecimiento>("/api/v1/establecimientos", data, token),

  update: (token: string, id: string, data: Partial<EstablecimientoCreate>) =>
    apiClient.put<Establecimiento>(`/api/v1/establecimientos/${id}`, data, token),

  delete: (token: string, id: string) =>
    apiClient.delete<void>(`/api/v1/establecimientos/${id}`, token),

  listHabitaciones: (token: string, id: string) =>
    apiClient.get<Habitacion[]>(
      `/api/v1/establecimientos/${id}/habitaciones`,
      token
    ),

  createHabitacion: (token: string, id: string, data: HabitacionCreate) =>
    apiClient.post<Habitacion>(
      `/api/v1/establecimientos/${id}/habitaciones`,
      data,
      token
    ),

  updateHabitacion: (token: string, id: string, habId: string, data: HabitacionCreate) =>
    apiClient.put<Habitacion>(
      `/api/v1/establecimientos/${id}/habitaciones/${habId}`,
      data,
      token
    ),

  updateHabitacionEstado: (token: string, estId: string, habId: string, estado: "DISPONIBLE" | "MANTENIMIENTO") =>
    apiClient.patch<{ status: string }>(
      `/api/v1/establecimientos/${estId}/habitaciones/${habId}/estado`,
      { estado },
      token
    ),

  listCategorias: (token: string) =>
    apiClient.get<Categoria[]>("/api/v1/catalogos/categorias", token),

  listLocalidades: (token: string) =>
    apiClient.get<Localidad[]>("/api/v1/geo/localidades", token),

  listTiposHabitacion: (token: string) =>
    apiClient.get<TipoHabitacion[]>("/api/v1/catalogos/tipos-habitacion", token),

  listTiposCama: (token: string) =>
    apiClient.get<TipoCama[]>("/api/v1/catalogos/tipos-cama", token),

  // -- Personal --

  listTiposPersonal: (token: string) =>
    apiClient.get<import("@/types/api").TipoPersonal[]>("/api/v1/catalogos/tipos-personal", token),
  
  listPersonal: (token: string, id: string) =>
    apiClient.get<import("@/types/api").Personal[]>(
      `/api/v1/establecimientos/${id}/personal`,
      token
    ),

  createPersonal: (token: string, id: string, data: import("@/types/api").PersonalCreate) =>
    apiClient.post<import("@/types/api").Personal>(
      `/api/v1/establecimientos/${id}/personal`,
      data,
      token
    ),

  updatePersonal: (token: string, id: string, personalId: string, data: import("@/types/api").PersonalUpdate) =>
    apiClient.put<import("@/types/api").Personal>(
      `/api/v1/establecimientos/${id}/personal/${personalId}`,
      data,
      token
    ),

  togglePersonalActivo: (token: string, id: string, personalId: string, activo: boolean) =>
    apiClient.patch<{status: string}>(
      `/api/v1/establecimientos/${id}/personal/${personalId}/activo`,
      { activo },
      token
    ),

  listAuditoria: (
    token: string,
    params?: { page?: number; pageSize?: number; search?: string; accion?: string; tabla?: string; rol?: string; fechaDesde?: string; fechaHasta?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.page)       q.set("page",         String(params.page));
    if (params?.pageSize)   q.set("page_size",     String(params.pageSize));
    if (params?.search)     q.set("search",        params.search);
    if (params?.accion)     q.set("accion",        params.accion);
    if (params?.tabla)      q.set("tabla",         params.tabla);
    if (params?.rol)        q.set("rol",           params.rol);
    if (params?.fechaDesde) q.set("fecha_desde",   params.fechaDesde);
    if (params?.fechaHasta) q.set("fecha_hasta",   params.fechaHasta);
    return apiClient.get<PagedResult<AuditoriaTransaccion>>(
      `/api/v1/auditoria?${q}`,
      token
    );
  },

  listAuditoriaMovimientos: (
    token: string,
    params?: { page?: number; pageSize?: number; search?: string; accion?: string; tabla?: string; rol?: string; fechaDesde?: string; fechaHasta?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.page)       q.set("page",         String(params.page));
    if (params?.pageSize)   q.set("page_size",     String(params.pageSize));
    if (params?.search)     q.set("search",        params.search);
    if (params?.accion)     q.set("accion",        params.accion);
    if (params?.tabla)      q.set("tabla",         params.tabla);
    if (params?.rol)        q.set("rol",           params.rol);
    if (params?.fechaDesde) q.set("fecha_desde",   params.fechaDesde);
    if (params?.fechaHasta) q.set("fecha_hasta",   params.fechaHasta);
    return apiClient.get<PagedResult<AuditoriaTransaccion>>(
      `/api/v1/movimientos/auditoria?${q}`,
      token
    );
  },

  listAuditoriaSistema: (
    token: string,
    params?: { page?: number; pageSize?: number; search?: string; accion?: string; tabla?: string; rol?: string; fechaDesde?: string; fechaHasta?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.page)       q.set("page",         String(params.page));
    if (params?.pageSize)   q.set("page_size",     String(params.pageSize));
    if (params?.search)     q.set("search",        params.search);
    if (params?.accion)     q.set("accion",        params.accion);
    if (params?.tabla)      q.set("tabla",         params.tabla);
    if (params?.rol)        q.set("rol",           params.rol);
    if (params?.fechaDesde) q.set("fecha_desde",   params.fechaDesde);
    if (params?.fechaHasta) q.set("fecha_hasta",   params.fechaHasta);
    return apiClient.get<PagedResult<AuditoriaTransaccion>>(
      `/api/v1/sistema/auditoria?${q}`,
      token
    );
  },
};

