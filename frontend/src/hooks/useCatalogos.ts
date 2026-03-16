import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { catalogosApi } from "@/lib/api/catalogos";
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

// --------- CLASIFICACIONES ---------
export function useClasificaciones(token: string | undefined) {
  return useQuery({
    queryKey: ["catalogos", "clasificaciones"],
    queryFn: () => catalogosApi.listClasificaciones(token!),
    enabled: !!token,
  });
}
export function useMutateClasificacion(token: string | undefined) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (data: Partial<Clasificacion>) => catalogosApi.createClasificacion(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "clasificaciones"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Clasificacion> }) => catalogosApi.updateClasificacion(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "clasificaciones"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string | number) => catalogosApi.deleteClasificacion(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "clasificaciones"] }),
  });
  return { create, update, remove };
}

// --------- CATEGORIAS ---------
export function useCategorias(token: string | undefined) {
  return useQuery({
    queryKey: ["catalogos", "categorias"],
    queryFn: () => catalogosApi.listCategorias(token!),
    enabled: !!token,
  });
}
export function useMutateCategoria(token: string | undefined) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (data: Partial<Categoria>) => catalogosApi.createCategoria(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "categorias"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Categoria> }) => catalogosApi.updateCategoria(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "categorias"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string | number) => catalogosApi.deleteCategoria(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "categorias"] }),
  });
  return { create, update, remove };
}

// --------- SERVICIOS ---------
export function useServicios(token: string | undefined) {
  return useQuery({
    queryKey: ["catalogos", "servicios"],
    queryFn: () => catalogosApi.listServicios(token!),
    enabled: !!token,
  });
}
export function useMutateServicio(token: string | undefined) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (data: Partial<Servicio>) => catalogosApi.createServicio(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "servicios"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Servicio> }) => catalogosApi.updateServicio(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "servicios"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string | number) => catalogosApi.deleteServicio(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "servicios"] }),
  });
  return { create, update, remove };
}

// --------- TIPOS HABITACION ---------
export function useTiposHabitacion(token: string | undefined) {
  return useQuery({
    queryKey: ["catalogos", "tiposHabitacion"],
    queryFn: () => catalogosApi.listTiposHabitacion(token!),
    enabled: !!token,
  });
}
export function useMutateTipoHabitacion(token: string | undefined) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (data: Partial<TipoHabitacion>) => catalogosApi.createTipoHabitacion(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "tiposHabitacion"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<TipoHabitacion> }) => catalogosApi.updateTipoHabitacion(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "tiposHabitacion"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string | number) => catalogosApi.deleteTipoHabitacion(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "tiposHabitacion"] }),
  });
  return { create, update, remove };
}

// --------- TIPOS CAMA ---------
export function useTiposCama(token: string | undefined) {
  return useQuery({
    queryKey: ["catalogos", "tiposCama"],
    queryFn: () => catalogosApi.listTiposCama(token!),
    enabled: !!token,
  });
}
export function useMutateTipoCama(token: string | undefined) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (data: Partial<TipoCama>) => catalogosApi.createTipoCama(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "tiposCama"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<TipoCama> }) => catalogosApi.updateTipoCama(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "tiposCama"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string | number) => catalogosApi.deleteTipoCama(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "tiposCama"] }),
  });
  return { create, update, remove };
}

// --------- PAISES ---------
export function usePaises(token: string | undefined) {
  return useQuery({
    queryKey: ["catalogos", "paises"],
    queryFn: () => catalogosApi.listPaises(token!),
    enabled: !!token,
  });
}
export function useMutatePais(token: string | undefined) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (data: Partial<Pais>) => catalogosApi.createPais(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "paises"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Pais> }) => catalogosApi.updatePais(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "paises"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string | number) => catalogosApi.deletePais(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "paises"] }),
  });
  return { create, update, remove };
}

// --------- DIV PRINCIPALES ---------
export function useDivisionesPrincipales(token: string | undefined) {
  return useQuery({
    queryKey: ["catalogos", "divisionesPrincipales"],
    queryFn: () => catalogosApi.listDivisionesPrincipales(token!),
    enabled: !!token,
  });
}
export function useMutateDivisionPrincipal(token: string | undefined) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (data: Partial<DivisionPrincipal>) => catalogosApi.createDivisionPrincipal(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "divisionesPrincipales"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<DivisionPrincipal> }) => catalogosApi.updateDivisionPrincipal(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "divisionesPrincipales"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string | number) => catalogosApi.deleteDivisionPrincipal(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "divisionesPrincipales"] }),
  });
  return { create, update, remove };
}

// --------- DIV SECUNDARIAS ---------
export function useDivisionesSecundarias(token: string | undefined) {
  return useQuery({
    queryKey: ["catalogos", "divisionesSecundarias"],
    queryFn: () => catalogosApi.listDivisionesSecundarias(token!),
    enabled: !!token,
  });
}
export function useMutateDivisionSecundaria(token: string | undefined) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (data: Partial<DivisionSecundaria>) => catalogosApi.createDivisionSecundaria(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "divisionesSecundarias"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<DivisionSecundaria> }) => catalogosApi.updateDivisionSecundaria(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "divisionesSecundarias"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string | number) => catalogosApi.deleteDivisionSecundaria(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "divisionesSecundarias"] }),
  });
  return { create, update, remove };
}

// --------- LOCALIDADES ---------
export function useLocalidades(token: string | undefined) {
  return useQuery({
    queryKey: ["catalogos", "localidades"],
    queryFn: () => catalogosApi.listLocalidades(token!),
    enabled: !!token,
  });
}
export function useMutateLocalidad(token: string | undefined) {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (data: Partial<Localidad>) => catalogosApi.createLocalidad(token!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "localidades"] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Localidad> }) => catalogosApi.updateLocalidad(token!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "localidades"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string | number) => catalogosApi.deleteLocalidad(token!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos", "localidades"] }),
  });
  return { create, update, remove };
}
