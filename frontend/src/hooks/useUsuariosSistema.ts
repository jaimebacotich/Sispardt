"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usuariosSistemaApi } from "@/lib/api/usuarios-sistema";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type {
  UsuarioSistemaCreate,
  UsuarioSistemaUpdate,
} from "@/types/api";

export const USUARIOS_QUERY_KEYS = {
  usuarios: ["usuarios-sistema"] as const,
  usuario: (id: string) => ["usuarios-sistema", id] as const,
  roles: ["usuarios-sistema-roles"] as const,
};

type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  estado?: string;
};

export function useUsuariosSistema(params?: ListParams) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: [...USUARIOS_QUERY_KEYS.usuarios, params],
    queryFn: () => usuariosSistemaApi.list(accessToken!, params),
    enabled: !!accessToken,
  });
}

export function useRolesSistema() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: USUARIOS_QUERY_KEYS.roles,
    queryFn: () => usuariosSistemaApi.listRoles(accessToken!),
    enabled: !!accessToken,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateUsuarioSistema() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UsuarioSistemaCreate) =>
      usuariosSistemaApi.create(accessToken!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USUARIOS_QUERY_KEYS.usuarios });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateUsuarioSistema(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UsuarioSistemaUpdate) =>
      usuariosSistemaApi.update(accessToken!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USUARIOS_QUERY_KEYS.usuarios });
      toast.success("Usuario actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCambiarRolUsuario(id: string) {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rolNombre: string) =>
      usuariosSistemaApi.cambiarRol(accessToken!, id, rolNombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USUARIOS_QUERY_KEYS.usuarios });
      toast.success("Rol actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteUsuarioSistema() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usuariosSistemaApi.delete(accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USUARIOS_QUERY_KEYS.usuarios });
      toast.success("Usuario eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
