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
    return { nombre: null, isLoading: false };
  }

  return {
    nombre: query.data?.razonSocial ?? null,
    isLoading: query.isLoading,
  };
}
