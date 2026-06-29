import { apiClient } from "@/lib/api-client";
import type {
  ParteDiario,
  ParteDiarioCreate,
  HabitacionEstado,
  CierreDiario,
  FechaPendiente,
  OcupacionDiaria,
  ResumenEstadisticas,
  NacionalidadStat,
  MotivosPeriodo,
  TipoHabitacionStat,
  PagedResult,
  CatalogosMovimientos,
} from "@/types/api";

export const movimientosApi = {
  // ── Catálogos ────────────────────────────────────────────
  getCatalogos: (token: string) =>
    apiClient.get<CatalogosMovimientos>("/api/v1/catalogos/movimientos", token),

  // ── Habitaciones ─────────────────────────────────────────
  listHabitacionesEstado: (token: string, fecha?: string) => {
    const url = fecha
      ? `/api/v1/partes/estado-habitaciones?fecha=${fecha}`
      : "/api/v1/partes/estado-habitaciones";
    return apiClient.get<HabitacionEstado[]>(url, token);
  },

  // ── Partes Diarios ────────────────────────────────────────
  listPartes: (
    token: string,
    params?: {
      page?: number;
      pageSize?: number;
      establecimientoId?: string;
      estadoOperativo?: string;
      soloActivos?: boolean;
      soloCheckout?: boolean;
      fechaReporte?: string;
      incluirAnulados?: boolean;
      salidaFecha?: string;
      activoEnFecha?: string;
    }
  ) => {
    const q = new URLSearchParams();
    if (params?.page)               q.set("page", String(params.page));
    if (params?.pageSize)           q.set("page_size", String(params.pageSize));
    if (params?.establecimientoId)  q.set("establecimiento_id", params.establecimientoId);
    if (params?.estadoOperativo)    q.set("estado_operativo", params.estadoOperativo);
    if (params?.soloActivos)        q.set("solo_activos", "true");
    if (params?.soloCheckout)       q.set("solo_checkout", "true");
    if (params?.fechaReporte)       q.set("fecha_reporte", params.fechaReporte);
    if (params?.incluirAnulados)    q.set("incluir_anulados", "true");
    if (params?.salidaFecha)        q.set("salida_fecha", params.salidaFecha);
    if (params?.activoEnFecha)      q.set("activo_en_fecha", params.activoEnFecha);
    return apiClient.get<PagedResult<ParteDiario>>(`/api/v1/partes?${q}`, token);
  },

  createParte: (token: string, data: ParteDiarioCreate) =>
    apiClient.post<ParteDiario>("/api/v1/partes", data, token),

  checkout: (token: string, parteId: string) =>
    apiClient.post<ParteDiario>(`/api/v1/partes/${parteId}/checkout`, {}, token),

  anularParte: (token: string, id: string) =>
    apiClient.delete<void>(`/api/v1/partes/${id}`, token),

  // ── Cierres ───────────────────────────────────────────────
  listCierres: (token: string) =>
    apiClient.get<CierreDiario[]>("/api/v1/cierres", token),

  getCierrePorFecha: async (token: string, fecha: string): Promise<CierreDiario | null> => {
    try {
      return await apiClient.get<CierreDiario>(`/api/v1/cierres/${fecha}`, token);
    } catch {
      return null;
    }
  },

  getFechaCierreActual: (token: string) =>
    apiClient.get<{ fechaHoy: string; fechaCierre: string; fechaInicioOperaciones: string | null }>("/api/v1/cierres/fecha-cierre-actual", token),

  getPreviewCierre: (token: string, fecha: string) =>
    apiClient.get<{ totalCheckins: number; totalCheckouts: number; huespedes: number }>(`/api/v1/cierres/preview?fecha=${fecha}`, token),

  getFechasPendientes: (token: string) =>
    apiClient.get<FechaPendiente[]>("/api/v1/cierres/pendientes", token),

  createCierre: (token: string, data: { fechaReporte: string; observacion?: string }) =>
    apiClient.post<CierreDiario>("/api/v1/cierres", data, token),

  // ── Estadísticas ──────────────────────────────────────────
  getOcupacion: (
    token: string,
    params: { fechaDesde: string; fechaHasta: string; establecimientoIds?: string[] }
  ) => {
    const q = new URLSearchParams({
      fecha_desde: params.fechaDesde,
      fecha_hasta: params.fechaHasta,
    });
    if (params.establecimientoIds?.length === 1) q.set("establecimiento_id", params.establecimientoIds[0]);
    else if (params.establecimientoIds && params.establecimientoIds.length > 1) q.set("establecimiento_ids", params.establecimientoIds.join(","));
    return apiClient.get<OcupacionDiaria[]>(`/api/v1/estadisticas/ocupacion?${q}`, token);
  },

  getResumen: (
    token: string,
    params: { establecimientoIds?: string[]; fechaDesde: string; fechaHasta: string }
  ) => {
    const q = new URLSearchParams({ fecha_desde: params.fechaDesde, fecha_hasta: params.fechaHasta });
    if (params.establecimientoIds?.length === 1) q.set("establecimiento_id", params.establecimientoIds[0]);
    else if (params.establecimientoIds && params.establecimientoIds.length > 1) q.set("establecimiento_ids", params.establecimientoIds.join(","));
    return apiClient.get<ResumenEstadisticas>(`/api/v1/estadisticas/resumen?${q}`, token);
  },

  getNacionalidades: (
    token: string,
    params: { establecimientoIds?: string[]; fechaDesde: string; fechaHasta: string }
  ) => {
    const q = new URLSearchParams({ fecha_desde: params.fechaDesde, fecha_hasta: params.fechaHasta });
    if (params.establecimientoIds?.length === 1) q.set("establecimiento_id", params.establecimientoIds[0]);
    else if (params.establecimientoIds && params.establecimientoIds.length > 1) q.set("establecimiento_ids", params.establecimientoIds.join(","));
    return apiClient.get<NacionalidadStat[]>(`/api/v1/estadisticas/nacionalidades?${q}`, token);
  },

  getMotivosViaje: (
    token: string,
    params: { establecimientoIds?: string[]; fechaDesde: string; fechaHasta: string; agrupacion?: string }
  ) => {
    const q = new URLSearchParams({ fecha_desde: params.fechaDesde, fecha_hasta: params.fechaHasta });
    if (params.establecimientoIds?.length === 1) q.set("establecimiento_id", params.establecimientoIds[0]);
    else if (params.establecimientoIds && params.establecimientoIds.length > 1) q.set("establecimiento_ids", params.establecimientoIds.join(","));
    if (params.agrupacion) q.set("agrupacion", params.agrupacion);
    return apiClient.get<MotivosPeriodo[]>(`/api/v1/estadisticas/motivos?${q}`, token);
  },

  getTiposHabitacion: (
    token: string,
    params: { establecimientoIds?: string[]; fechaDesde: string; fechaHasta: string }
  ) => {
    const q = new URLSearchParams({ fecha_desde: params.fechaDesde, fecha_hasta: params.fechaHasta });
    if (params.establecimientoIds?.length === 1) q.set("establecimiento_id", params.establecimientoIds[0]);
    else if (params.establecimientoIds && params.establecimientoIds.length > 1) q.set("establecimiento_ids", params.establecimientoIds.join(","));
    return apiClient.get<TipoHabitacionStat[]>(`/api/v1/estadisticas/tipos-habitacion?${q}`, token);
  },

  // ── Reporte Parte Diario (PDF binario) ───────────────────
  getReportePDF: (
    token: string,
    fecha: string,
    nombre: string,
    clasificacion: string,
    categoria: string,
    direccion: string,
    telefono: string,
    establecimientoId?: string   // solo para responsable_registro
  ) => {
    const q = new URLSearchParams({ fecha });
    if (establecimientoId) q.set("establecimiento_id", establecimientoId);
    q.set("nombre",        nombre);
    q.set("clasificacion", clasificacion);
    q.set("categoria",     categoria);
    q.set("direccion",     direccion);
    q.set("telefono",      telefono);
    return apiClient.getBlob(`/api/v1/partes/reporte?${q}`, token);
  },

  // ── Reporte Consolidado Nacional (PDF binario) ────────────
  getReporteMunicipioInternacionalPDF: (
    token: string,
    body: {
      municipio: string;
      anio: number;
      mes: number;
      establecimientos: { id: string; nombre: string; clasificacion: string; categoria: string }[];
    }
  ) =>
    fetch("/api/v1/partes/reporte-municipio-internacional", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then((res) => {
      if (!res.ok) throw new Error("Error al generar reporte municipio internacional");
      return res.blob();
    }),

  getReporteMunicipioNacionalPDF: (
    token: string,
    body: {
      municipio: string;
      anio: number;
      mes: number;
      establecimientos: { id: string; nombre: string; clasificacion: string; categoria: string }[];
    }
  ) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    return fetch("/api/v1/partes/reporte-municipio-nacional", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }).then((res) => {
      if (!res.ok) throw new Error("Error al generar reporte municipio");
      return res.blob();
    });
  },

  getReporteInternacionalPDF: (
    token: string,
    establecimientoId: string,
    anio: number,
    mes: number,
    nombre: string,
    municipio: string
  ) =>
    apiClient.getBlob(
      `/api/v1/partes/reporte-internacional?establecimiento_id=${establecimientoId}&anio=${anio}&mes=${mes}&nombre=${encodeURIComponent(nombre)}&municipio=${encodeURIComponent(municipio)}`,
      token
    ),

  getReporteNacionalPDF: (
    token: string,
    establecimientoId: string,
    anio: number,
    mes: number,
    nombre: string,
    municipio: string
  ) =>
    apiClient.getBlob(
      `/api/v1/partes/reporte-nacional?establecimiento_id=${establecimientoId}&anio=${anio}&mes=${mes}&nombre=${encodeURIComponent(nombre)}&municipio=${encodeURIComponent(municipio)}`,
      token
    ),
};
