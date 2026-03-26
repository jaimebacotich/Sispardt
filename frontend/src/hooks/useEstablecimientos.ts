"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { establecimientosApi } from "@/lib/api/establecimientos";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { EstablecimientoCreate, HabitacionCreate } from "@/types/api";

export const QUERY_KEYS = {
  establecimientos: ["establecimientos"] as const,
  establecimiento: (id: string) => ["establecimientos", id] as const,
  habitaciones: (id: string) => ["establecimientos", id, "habitaciones"] as const,
  categorias: ["categorias"] as const,
  localidades: ["localidades"] as const,
  auditoria: (params: object) => ["auditoria", params] as const,
  auditoriaMovimientos: (params: object) => ["auditoria-movimientos", params] as const,
};

export function useEstablecimientos(params?: { search?: string; categoriaId?: string; localidadId?: string; pageSize?: number }) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: [...QUERY_KEYS.establecimientos, params],
    queryFn: () => establecimientosApi.list(accessToken!, params),
    enabled: !!accessToken,
  });
}

export function useEstablecimiento(id: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.establecimiento(id),
    queryFn: () => establecimientosApi.getById(accessToken!, id),
    enabled: !!accessToken && !!id,
  });
}

export function useCreateEstablecimiento() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EstablecimientoCreate) =>
      establecimientosApi.create(accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.establecimientos });
      toast.success("Establecimiento creado exitosamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteEstablecimiento() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => establecimientosApi.delete(accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.establecimientos });
      toast.success("Establecimiento eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useHabitaciones(establecimientoId: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.habitaciones(establecimientoId),
    queryFn: () => establecimientosApi.listHabitaciones(accessToken!, establecimientoId),
    enabled: !!accessToken && !!establecimientoId,
  });
}

export function useCreateHabitacion(establecimientoId: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HabitacionCreate) =>
      establecimientosApi.createHabitacion(accessToken!, establecimientoId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.habitaciones(establecimientoId) });
      toast.success("Habitación guardada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCategorias() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.categorias,
    queryFn: () => establecimientosApi.listCategorias(accessToken!),
    enabled: !!accessToken,
    staleTime: 10 * 60 * 1000, // catálogos: 10 min
  });
}

export function useLocalidades() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.localidades,
    queryFn: () => establecimientosApi.listLocalidades(accessToken!),
    enabled: !!accessToken,
    staleTime: 10 * 60 * 1000,
  });
}

type AuditoriaParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  accion?: string;
  tabla?: string;
  rol?: string;
  fechaDesde?: string;
  fechaHasta?: string;
};

export function useAuditoria(params?: AuditoriaParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.auditoria(params ?? {}),
    queryFn: () => establecimientosApi.listAuditoria(accessToken!, params),
    enabled: !!accessToken,
  });
}

export function useAuditoriaMovimientos(params?: AuditoriaParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: QUERY_KEYS.auditoriaMovimientos(params ?? {}),
    queryFn: () => establecimientosApi.listAuditoriaMovimientos(accessToken!, params),
    enabled: !!accessToken,
  });
}
