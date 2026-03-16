import { apiClient } from "@/lib/api-client";
import type {
  Clasificacion,
  Categoria,
  Servicio,
  TipoHabitacion,
  TipoCama,
  Pais,
  DivisionPrincipal,
  DivisionSecundaria,
  Localidad,
} from "@/types/api";

export const catalogosApi = {
  // --------- CLASIFICACIONES ---------
  listClasificaciones: (token: string) => apiClient.get<Clasificacion[]>("/api/v1/catalogos/clasificaciones", token),
  createClasificacion: (token: string, data: Partial<Clasificacion>) => apiClient.post<Clasificacion>("/api/v1/catalogos/clasificaciones", data, token),
  updateClasificacion: (token: string, id: string | number, data: Partial<Clasificacion>) => apiClient.put<unknown>(`/api/v1/catalogos/clasificaciones/${id}`, data, token),
  deleteClasificacion: (token: string, id: string | number) => apiClient.delete<void>(`/api/v1/catalogos/clasificaciones/${id}`, token),

  // --------- CATEGORIAS ---------
  listCategorias: (token: string) => apiClient.get<Categoria[]>("/api/v1/catalogos/categorias", token),
  createCategoria: (token: string, data: Partial<Categoria>) => apiClient.post<Categoria>("/api/v1/catalogos/categorias", data, token),
  updateCategoria: (token: string, id: string | number, data: Partial<Categoria>) => apiClient.put<unknown>(`/api/v1/catalogos/categorias/${id}`, data, token),
  deleteCategoria: (token: string, id: string | number) => apiClient.delete<void>(`/api/v1/catalogos/categorias/${id}`, token),

  // --------- SERVICIOS ---------
  listServicios: (token: string) => apiClient.get<Servicio[]>("/api/v1/catalogos/servicios", token),
  createServicio: (token: string, data: Partial<Servicio>) => apiClient.post<Servicio>("/api/v1/catalogos/servicios", data, token),
  updateServicio: (token: string, id: string | number, data: Partial<Servicio>) => apiClient.put<unknown>(`/api/v1/catalogos/servicios/${id}`, data, token),
  deleteServicio: (token: string, id: string | number) => apiClient.delete<void>(`/api/v1/catalogos/servicios/${id}`, token),

  // --------- TIPOS HABITACION ---------
  listTiposHabitacion: (token: string) => apiClient.get<TipoHabitacion[]>("/api/v1/catalogos/tipos-habitacion", token),
  createTipoHabitacion: (token: string, data: Partial<TipoHabitacion>) => apiClient.post<TipoHabitacion>("/api/v1/catalogos/tipos-habitacion", data, token),
  updateTipoHabitacion: (token: string, id: string | number, data: Partial<TipoHabitacion>) => apiClient.put<unknown>(`/api/v1/catalogos/tipos-habitacion/${id}`, data, token),
  deleteTipoHabitacion: (token: string, id: string | number) => apiClient.delete<void>(`/api/v1/catalogos/tipos-habitacion/${id}`, token),

  // --------- TIPOS CAMA ---------
  listTiposCama: (token: string) => apiClient.get<TipoCama[]>("/api/v1/catalogos/tipos-cama", token),
  createTipoCama: (token: string, data: Partial<TipoCama>) => apiClient.post<TipoCama>("/api/v1/catalogos/tipos-cama", data, token),
  updateTipoCama: (token: string, id: string | number, data: Partial<TipoCama>) => apiClient.put<unknown>(`/api/v1/catalogos/tipos-cama/${id}`, data, token),
  deleteTipoCama: (token: string, id: string | number) => apiClient.delete<void>(`/api/v1/catalogos/tipos-cama/${id}`, token),

  // --------- PAISES ---------
  listPaises: (token: string) => apiClient.get<Pais[]>("/api/v1/geo/paises", token),
  createPais: (token: string, data: Partial<Pais>) => apiClient.post<Pais>("/api/v1/geo/paises", data, token),
  updatePais: (token: string, id: string | number, data: Partial<Pais>) => apiClient.put<unknown>(`/api/v1/geo/paises/${id}`, data, token),
  deletePais: (token: string, id: string | number) => apiClient.delete<void>(`/api/v1/geo/paises/${id}`, token),

  // --------- DIV PRINCIPALES ---------
  listDivisionesPrincipales: (token: string) => apiClient.get<DivisionPrincipal[]>("/api/v1/geo/divisiones-principales", token),
  createDivisionPrincipal: (token: string, data: Partial<DivisionPrincipal>) => apiClient.post<DivisionPrincipal>("/api/v1/geo/divisiones-principales", data, token),
  updateDivisionPrincipal: (token: string, id: string | number, data: Partial<DivisionPrincipal>) => apiClient.put<unknown>(`/api/v1/geo/divisiones-principales/${id}`, data, token),
  deleteDivisionPrincipal: (token: string, id: string | number) => apiClient.delete<void>(`/api/v1/geo/divisiones-principales/${id}`, token),

  // --------- DIV SECUNDARIAS ---------
  listDivisionesSecundarias: (token: string) => apiClient.get<DivisionSecundaria[]>("/api/v1/geo/divisiones-secundarias", token),
  createDivisionSecundaria: (token: string, data: Partial<DivisionSecundaria>) => apiClient.post<DivisionSecundaria>("/api/v1/geo/divisiones-secundarias", data, token),
  updateDivisionSecundaria: (token: string, id: string | number, data: Partial<DivisionSecundaria>) => apiClient.put<unknown>(`/api/v1/geo/divisiones-secundarias/${id}`, data, token),
  deleteDivisionSecundaria: (token: string, id: string | number) => apiClient.delete<void>(`/api/v1/geo/divisiones-secundarias/${id}`, token),

  // --------- LOCALIDADES ---------
  listLocalidades: (token: string) => apiClient.get<Localidad[]>("/api/v1/geo/localidades", token),
  createLocalidad: (token: string, data: Partial<Localidad>) => apiClient.post<Localidad>("/api/v1/geo/localidades", data, token),
  updateLocalidad: (token: string, id: string | number, data: Partial<Localidad>) => apiClient.put<unknown>(`/api/v1/geo/localidades/${id}`, data, token),
  deleteLocalidad: (token: string, id: string | number) => apiClient.delete<void>(`/api/v1/geo/localidades/${id}`, token),
};
