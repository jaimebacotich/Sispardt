"use client";

import { useAuth } from "./useAuth";
import { useEstablecimiento } from "./useEstablecimientos";

/**
 * Retorna el establecimiento vinculado al usuario recepcionista.
 * Para otros roles retorna null sin hacer ninguna petición.
 */
export function useEstablecimientoActual() {
  const { isRecepcionista, establecimientoId } = useAuth();
  const id = isRecepcionista && establecimientoId ? establecimientoId : "";
  const query = useEstablecimiento(id);

  if (!isRecepcionista || !establecimientoId) {
    return { nombre: null, clasificacion: null, categoria: null, direccion: null, telefono: null, isLoading: false };
  }

  return {
    nombre:        query.data?.razonSocial         ?? null,
    clasificacion: query.data?.clasificacionNombre  ?? null,
    categoria:     query.data?.categoriaNombre      ?? null,
    direccion:     query.data?.direccion            ?? null,
    telefono:      query.data?.telefono             ?? null,
    isLoading:     query.isLoading,
  };
}
