"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { movimientosApi } from "@/lib/api/movimientos";
import { establecimientosApi } from "@/lib/api/establecimientos";
import { mockStore } from "@/lib/mocks";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { ParteDiarioCreate, CierreDiario, HabitacionEstado } from "@/types/api";

const USE_MOCK = process.env.NEXT_PUBLIC_MOCK_API === "true";

export const MOV_KEYS = {
  catalogos:           ["catalogos-mov"] as const,
  partes:              ["partes"] as const,
  partesActivos:       ["partes", "activos"] as const,
  partesCheckout:      ["partes", "checkout"] as const,
  partesFiltros:       (f: object) => ["partes", f] as const,
  habitacionesEstado:  ["habitaciones-estado"] as const,
  ocupacion:           (params: object) => ["ocupacion", params] as const,
  resumen:             (params: object) => ["estadisticas-resumen", params] as const,
  nacionalidades:      (params: object) => ["estadisticas-nacionalidades", params] as const,
  motivosViaje:        (params: object) => ["estadisticas-motivos", params] as const,
  tiposHabitacion:     (params: object) => ["estadisticas-tipos", params] as const,
  cierres:             ["cierres"] as const,
  cierrePorFecha:      (fecha: string) => ["cierres", fecha] as const,
  fechasPendientes:    ["cierres-pendientes"] as const,
  fechaCierreActual:   ["cierres-fecha-actual"] as const,
};

// ── Catálogos ──────────────────────────────────────────────────────────────
export function useCatalogosMovimientos() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.catalogos,
    queryFn: () =>
      USE_MOCK
        ? Promise.resolve(mockStore.catalogs.getAll())
        : movimientosApi.getCatalogos(accessToken!),
    enabled: USE_MOCK || !!accessToken,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Partes activos (huéspedes en casa) ─────────────────────────────────────
export function usePartesActivos() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.partesActivos,
    queryFn: () =>
      USE_MOCK
        ? Promise.resolve(mockStore.partes.getAll({ soloActivos: true }))
        : movimientosApi.listPartes(accessToken!, { soloActivos: true }),
    enabled: USE_MOCK || !!accessToken,
  });
}

// ── Partes con checkout ────────────────────────────────────────────────────
export function usePartesCheckout() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.partesCheckout,
    queryFn: () =>
      USE_MOCK
        ? Promise.resolve(mockStore.partes.getAll({ soloCheckout: true }))
        : movimientosApi.listPartes(accessToken!, { soloCheckout: true }),
    enabled: USE_MOCK || !!accessToken,
  });
}

// ── Todos los partes (con filtros opcionales) ──────────────────────────────
export function usePartes(params?: {
  estadoOperativo?: string;
  soloActivos?: boolean;
  soloCheckout?: boolean;
  fechaReporte?: string;
  incluirAnulados?: boolean;
  pageSize?: number;
  salidaFecha?: string;
  activoEnFecha?: string;
}) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.partesFiltros(params ?? {}),
    queryFn: () =>
      USE_MOCK
        ? Promise.resolve(mockStore.partes.getAll(params))
        : movimientosApi.listPartes(accessToken!, params),
    enabled: USE_MOCK || !!accessToken,
  });
}

// ── Crear parte (check-in) ─────────────────────────────────────────────────
export function useCreateParte() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ParteDiarioCreate) => {
      if (USE_MOCK) {
        const catalogs = mockStore.catalogs.getAll();
        const newParte = mockStore.partes.add(data, catalogs);
        return Promise.resolve(newParte);
      }
      return movimientosApi.createParte(accessToken!, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MOV_KEYS.partes });
      qc.invalidateQueries({ queryKey: MOV_KEYS.habitacionesEstado });
      toast.success("Parte diario registrado exitosamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Check-out ──────────────────────────────────────────────────────────────
export function useCheckout() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parteId: string) => {
      if (USE_MOCK) {
        const parte = mockStore.partes.checkout(parteId);
        return Promise.resolve(parte);
      }
      return movimientosApi.checkout(accessToken!, parteId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MOV_KEYS.partes });
      qc.invalidateQueries({ queryKey: MOV_KEYS.habitacionesEstado });
      toast.success("Check-out registrado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Anular parte ───────────────────────────────────────────────────────────
export function useAnularParte() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      if (USE_MOCK) {
        mockStore.partes.anular(id);
        return Promise.resolve();
      }
      return movimientosApi.anularParte(accessToken!, id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MOV_KEYS.partes });
      qc.invalidateQueries({ queryKey: MOV_KEYS.habitacionesEstado });
      toast.success("Parte anulado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Historial de cierres ───────────────────────────────────────────────────
export function useCierres() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.cierres,
    queryFn: () =>
      USE_MOCK
        ? Promise.resolve(mockStore.cierre.getAll())
        : movimientosApi.listCierres(accessToken!),
    enabled: USE_MOCK || !!accessToken,
  });
}

// ── Cierre por fecha ───────────────────────────────────────────────────────
export function useCierrePorFecha(fecha: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.cierrePorFecha(fecha),
    queryFn: (): Promise<CierreDiario | null> =>
      USE_MOCK
        ? Promise.resolve(mockStore.cierre.getPorFecha(fecha))
        : movimientosApi.getCierrePorFecha(accessToken!, fecha),
    enabled: !!fecha,
  });
}

// ── Fecha de cierre actual (desde servidor BD) ────────────────────────────
export function useFechaCierreActual() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.fechaCierreActual,
    queryFn: () => movimientosApi.getFechaCierreActual(accessToken!),
    enabled: !USE_MOCK && !!accessToken,
  });
}

// ── Fechas pendientes de cierre (fuera de plazo) ───────────────────────────
export function useFechasPendientes() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.fechasPendientes,
    queryFn: () =>
      USE_MOCK
        ? Promise.resolve(mockStore.cierre.getFechasPendientes())
        : movimientosApi.getFechasPendientes(accessToken!),
    enabled: USE_MOCK || !!accessToken,
  });
}

// ── Crear cierre diario ────────────────────────────────────────────────────
export function useCreateCierre() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fechaReporte: string; observacion?: string }) => {
      if (USE_MOCK) {
        return Promise.resolve(mockStore.cierre.realizar(data.fechaReporte, data.observacion));
      }
      return movimientosApi.createCierre(accessToken!, data);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: MOV_KEYS.cierres });
      qc.invalidateQueries({ queryKey: MOV_KEYS.fechasPendientes });
      qc.invalidateQueries({ queryKey: MOV_KEYS.cierrePorFecha(variables.fechaReporte) });
      toast.success("Cierre diario realizado correctamente");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Estado habitaciones ────────────────────────────────────────────────────
export function useHabitacionesEstado() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.habitacionesEstado,
    queryFn: () =>
      USE_MOCK
        ? Promise.resolve(mockStore.habitaciones.getAll())
        : movimientosApi.listHabitacionesEstado(accessToken!),
    enabled: USE_MOCK || !!accessToken,
    refetchInterval: USE_MOCK ? false : 30 * 1000,
  });
}

// ── Cambiar estado de habitación (mantenimiento / disponible) ───────────────
export function useUpdateHabitacionEstado() {
  const { accessToken, establecimientoId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ habId, estado }: { habId: string; estado: "DISPONIBLE" | "MANTENIMIENTO" }) => {
      if (USE_MOCK) {
        const estadoFrontend: HabitacionEstado["estado"] = estado === "MANTENIMIENTO" ? "mantenimiento" : "libre";
        qc.setQueryData<HabitacionEstado[]>(MOV_KEYS.habitacionesEstado, (prev = []) =>
          prev.map((h) => (h.id === habId ? { ...h, estado: estadoFrontend } : h))
        );
        return;
      }
      if (!accessToken || !establecimientoId) throw new Error("Sin autenticación");
      return establecimientosApi.updateHabitacionEstado(accessToken, establecimientoId, habId, estado);
    },
    onMutate: async ({ habId, estado }) => {
      // Actualización optimista: cambia el estado en cache inmediatamente
      await qc.cancelQueries({ queryKey: MOV_KEYS.habitacionesEstado });
      const prevData = qc.getQueryData<HabitacionEstado[]>(MOV_KEYS.habitacionesEstado);
      const estadoFrontend: HabitacionEstado["estado"] = estado === "MANTENIMIENTO" ? "mantenimiento" : "libre";
      qc.setQueryData<HabitacionEstado[]>(MOV_KEYS.habitacionesEstado, (prev = []) =>
        prev.map((h) => (h.id === habId ? { ...h, estado: estadoFrontend } : h))
      );
      return { prevData };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevData) {
        qc.setQueryData(MOV_KEYS.habitacionesEstado, context.prevData);
      }
      toast.error("Error al cambiar el estado de la habitación");
    },
    onSuccess: (_data, { estado }) => {
      const msg = estado === "MANTENIMIENTO" ? "Habitación en mantenimiento" : "Habitación disponible";
      toast.success(msg);
      // Refetch después de ~10s para dar tiempo a la propagación Kafka → réplica
      setTimeout(() => qc.invalidateQueries({ queryKey: MOV_KEYS.habitacionesEstado }), 10000);
    },
  });
}

// ── Estado habitaciones en una fecha histórica ─────────────────────────────
export function useHabitacionesEstadoEnFecha(fecha: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: [...MOV_KEYS.habitacionesEstado, fecha],
    queryFn: () =>
      USE_MOCK
        ? Promise.resolve(mockStore.habitaciones.getAll())
        : movimientosApi.listHabitacionesEstado(accessToken!, fecha),
    enabled: !!fecha && (USE_MOCK || !!accessToken),
  });
}

// ── Estadísticas de ocupación ──────────────────────────────────────────────
export function useOcupacion(params: { establecimientoIds?: string[]; fechaDesde: string; fechaHasta: string }) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.ocupacion(params),
    queryFn: () => movimientosApi.getOcupacion(accessToken!, params),
    enabled: !USE_MOCK && !!accessToken && !!params.fechaDesde && !!params.fechaHasta,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Resumen KPI ────────────────────────────────────────────────────────────
export function useResumenEstadisticas(params: { establecimientoIds?: string[]; fechaDesde: string; fechaHasta: string }) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.resumen(params),
    queryFn: () => movimientosApi.getResumen(accessToken!, params),
    enabled: !USE_MOCK && !!accessToken && !!params.fechaDesde && !!params.fechaHasta,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Top Nacionalidades ─────────────────────────────────────────────────────
export function useNacionalidades(params: { establecimientoIds?: string[]; fechaDesde: string; fechaHasta: string }) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.nacionalidades(params),
    queryFn: () => movimientosApi.getNacionalidades(accessToken!, params),
    enabled: !USE_MOCK && !!accessToken && !!params.fechaDesde && !!params.fechaHasta,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Motivos de Viaje ───────────────────────────────────────────────────────
export function useMotivosViaje(params: { establecimientoIds?: string[]; fechaDesde: string; fechaHasta: string; agrupacion?: string }) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.motivosViaje(params),
    queryFn: () => movimientosApi.getMotivosViaje(accessToken!, params),
    enabled: !USE_MOCK && !!accessToken && !!params.fechaDesde && !!params.fechaHasta,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Tipos de Habitación ────────────────────────────────────────────────────
export function useTiposHabitacion(params: { establecimientoIds?: string[]; fechaDesde: string; fechaHasta: string }) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: MOV_KEYS.tiposHabitacion(params),
    queryFn: () => movimientosApi.getTiposHabitacion(accessToken!, params),
    enabled: !USE_MOCK && !!accessToken && !!params.fechaDesde && !!params.fechaHasta,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Reporte Consolidado Municipio Internacional PDF ───────────────────────
export function useReporteMunicipioInternacionalPDF() {
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: async (body: {
      municipio: string;
      anio: number;
      mes: number;
      establecimientos: { id: string; nombre: string; clasificacion: string; categoria: string }[];
    }) => {
      if (!accessToken) throw new Error("Sin autenticación");
      const blob = await movimientosApi.getReporteMunicipioInternacionalPDF(accessToken, body);
      return URL.createObjectURL(blob);
    },
  });
}

// ── Reporte Consolidado Municipio Nacional PDF ────────────────────────────
export function useReporteMunicipioNacionalPDF() {
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: async (body: {
      municipio: string;
      anio: number;
      mes: number;
      establecimientos: { id: string; nombre: string; clasificacion: string; categoria: string }[];
    }) => {
      if (!accessToken) throw new Error("Sin autenticación");
      const blob = await movimientosApi.getReporteMunicipioNacionalPDF(accessToken, body);
      return URL.createObjectURL(blob);
    },
  });
}

// ── Reporte Consolidado Internacional PDF ─────────────────────────────────
export function useReporteInternacionalPDF(
  establecimientoId: string | null,
  anio: number | null,
  mes: number | null,
  nombre: string,
  municipio: string
) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["reporte-internacional-pdf", establecimientoId, anio, mes],
    queryFn: async () => {
      const blob = await movimientosApi.getReporteInternacionalPDF(
        accessToken!, establecimientoId!, anio!, mes!, nombre, municipio
      );
      return URL.createObjectURL(blob);
    },
    enabled: !USE_MOCK && !!accessToken && !!establecimientoId && !!anio && !!mes && !!nombre,
    staleTime: 0,
    retry: 1,
    gcTime: 0,
  });
}

// ── Reporte Consolidado Nacional PDF ──────────────────────────────────────
export function useReporteNacionalPDF(
  establecimientoId: string | null,
  anio: number | null,
  mes: number | null,
  nombre: string,
  municipio: string
) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["reporte-nacional-pdf", establecimientoId, anio, mes],
    queryFn: async () => {
      const blob = await movimientosApi.getReporteNacionalPDF(
        accessToken!, establecimientoId!, anio!, mes!, nombre, municipio
      );
      return URL.createObjectURL(blob);
    },
    enabled: !USE_MOCK && !!accessToken && !!establecimientoId && !!anio && !!mes && !!nombre,
    staleTime: 0,
    retry: 1,
    gcTime: 0,
  });
}

// ── Reporte Parte Diario PDF ───────────────────────────────────────────────
export function useReportePDF(
  fecha: string | null,
  nombreEstablecimiento: string,
  clasificacion: string,
  categoria: string,
  direccion: string,
  telefono: string,
  establecimientoId?: string   // opcional: solo para responsable_registro
) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["reporte-pdf", fecha, establecimientoId],
    queryFn: async () => {
      const blob = await movimientosApi.getReportePDF(
        accessToken!, fecha!, nombreEstablecimiento,
        clasificacion, categoria, direccion, telefono,
        establecimientoId
      );
      return URL.createObjectURL(blob);
    },
    enabled: !USE_MOCK && !!accessToken && !!fecha && !!nombreEstablecimiento,
    staleTime: 0,
    retry: 1,
    gcTime: 0,
  });
}
