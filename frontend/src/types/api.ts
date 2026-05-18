/* ============================================================
 * Tipos compartidos de respuesta de API
 * ============================================================ */

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ============================================================
 * Establecimientos
 * ============================================================ */

export interface Clasificacion {
  id: string;
  nombre: string;
}

export interface Servicio {
  id: string;
  nombre: string;
}

export interface DivisionSecundariaEst {
  id: string;
  nombre: string;
  divisionPrincipalId: number;
}

export interface LocalidadEst {
  id: string;
  nombre: string;
  divisionSecundariaId: string;
}

export interface Establecimiento {
  id: string;
  nroLicencia: string | null;
  razonSocial: string;
  razonSocialCorta: string;
  propietarioNombre: string | null;
  clasificacionId: string;
  clasificacionNombre: string;
  categoriaId: string;
  categoriaNombre: string;
  divisionSecundariaId: string;
  divisionSecundariaNombre: string;
  localidadId: string;
  localidadNombre: string;
  direccion: string;
  telefono: string | null;
  email: string | null;
  tieneLicenciaTuristica: boolean;
  fechaVencimientoLicencia: string | null;
  latitud: number | null;
  longitud: number | null;
  serviciosIds: string[];
  capacidadHospedaje: number;
  activo: boolean;
  creadoEn: string;
  fechaInicioOperaciones: string; // YYYY-MM-DD
}

export interface EstablecimientoCreate {
  nroLicencia: string | null;
  razonSocial: string;
  razonSocialCorta: string;
  propietario?: string;
  clasificacionId: string;
  categoriaId: string;
  localidadId: string;
  direccion: string;
  telefono?: string;
  email?: string;
  tieneLicenciaTuristica: boolean;
  fechaVencimientoLicencia?: string;
  latitud?: number;
  longitud?: number;
  serviciosIds?: string[];
  fechaInicioOperaciones: string; // YYYY-MM-DD, requerido
}

export interface Habitacion {
  id: string;
  establecimientoId: string;
  numero: string;
  piso: number;
  tipoHabitacionId: string;
  tipoHabitacionNombre: string;
  capacidadTotal: number;
  activa: boolean;
  camas: HabitacionCama[];
}

export interface HabitacionCama {
  id: string;
  tipoCamaId: string;
  tipoCamaNombre: string;
  capacidadPersonas: number;
  cantidad: number;
}

export interface HabitacionCreate {
  tipoHabitacionId: number | null;
  nroHabitacion: string;
  piso: string | null;
  tieneBanoPrivado: boolean;
  camas: { tipoCamaId: number; cantidad: number }[];
}

export interface Categoria {
  id: number;
  nombre: string;
  clasificacionId: number | null;
  clasificacionNombre: string | null;
  descripcion: string | null;
}

export interface TipoHabitacion {
  id: string;
  nombre: string;
}

export interface TipoCama {
  id: string;
  nombre: string;
  capacidadPersonas: number;
}

export interface TipoPersonal {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Localidad {
  id: number;
  nombre: string;
  divisionSecundariaId: number | null;
  divisionSecundariaNombre: string | null;
  divisionPrincipalId: number | null;
  divisionPrincipalNombre: string | null;
  esSistema?: boolean;
}

/* ============================================================
 * Personal
 * ============================================================ */

export interface Personal {
  id: string;
  establecimientoId: string;
  tipoPersonalId: string;
  tipoPersonalNombre?: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  documentoIdentidad?: string;
  telefono?: string;
  activo: boolean;
  usuarioSistema: boolean;
  keycloakUserId?: string;
  username?: string;
  password_temporal?: string;
}

export interface PersonalCreate {
  tipoPersonalId: number;
  nombres: string;
  apellidos: string;
  documentoIdentidad?: string;
  telefono?: string;
  usuarioSistema: boolean;
  username?: string;
}

export interface PersonalUpdate {
  tipoPersonalId: number;
  nombres: string;
  apellidos: string;
  documentoIdentidad?: string;
  telefono?: string;
  usuarioSistema: boolean;
  username?: string;
}

/* ============================================================
 * Catálogos — Movimientos
 * ============================================================ */

export interface TipoDocumento {
  id: number;
  sigla: string;
  descripcion: string;
}

export interface MotivoViaje {
  id: number;
  nombre: string;
}

export interface Pais {
  id: number;
  nombre: string;
  codigoIso: string;
  esSistema?: boolean;
}

export interface DivisionPrincipal {
  id: number;
  paisId: number;
  paisNombre?: string;
  nombre: string;
  esSistema?: boolean;
}

export interface DivisionSecundaria {
  id: number;
  divisionPrincipalId: number;
  divisionPrincipalNombre?: string;
  nombre: string;
  esSistema?: boolean;
}

export interface LocalidadMov {
  id: number;
  divisionSecundariaId: number;
  nombre: string;
}

export interface CatalogosMovimientos {
  tiposDocumento: TipoDocumento[];
  motivosViaje: MotivoViaje[];
  paises: Pais[];
  divisionesPrincipales: DivisionPrincipal[];
  divisionesSecundarias: DivisionSecundaria[];
  localidades: LocalidadMov[];
}

/* ============================================================
 * Personas
 * ============================================================ */

export type Genero = "M" | "F" | "OTRO";

export interface Persona {
  id: string;
  tipoDocumentoId: number;
  tipoDocumentoSigla: string;
  documentoIdentidad: string;
  paisOrigenId: number;
  paisOrigenNombre: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  fechaNacimiento: string;
  profesion: string | null;
  genero: Genero;
  creadoAt: string;
}

export interface PersonaCreate {
  tipoDocumentoId: number;
  documentoIdentidad: string;
  paisOrigenId: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  fechaNacimiento: string;
  profesion?: string;
  genero: Genero;
}

/* ============================================================
 * Movimientos — Habitaciones Estado
 * (API computa estado a partir de partes + replica cache)
 * ============================================================ */

export type EstadoHabitacion = "libre" | "ocupada" | "mantenimiento";

export interface HabitacionEstado {
  id: string;              // habitacion_id (uuid)
  numero: string;          // nro_habitacion
  piso: string;            // piso (varchar en BD)
  tipoNombre: string;      // tipo_habitacion
  capacidad: number;       // capacidad_calculada
  ocupacionActual: number; // huéspedes activos en este momento
  estado: EstadoHabitacion;
  parteActualId?: string;
  huespedes?: string[];    // nombres de todos los huéspedes activos
}

/* ============================================================
 * Movimientos — Partes Diarios
 * ============================================================ */

export type EstadoOperativo = "ACTIVO" | "ANULADO";
export type CondicionEntrega = "DENTRO_PLAZO" | "FUERA_PLAZO";

export interface ParteDiario {
  id: string;
  establecimientoId: string;
  habitacionId: string;
  habNroSnapshot: string;
  habTipoSnapshot: string;
  habPisoSnapshot: string;
  persona: Persona;
  fechaReporte: string;       // date YYYY-MM-DD
  ingresoAt: string;          // datetime ISO
  salidaAt: string | null;    // null = activo, valor = checkout realizado
  paisProcedenciaId: number;
  paisProcedenciaNombre: string;
  localidadProcedenciaId: number | null;
  localidadProcedenciaNombre: string | null;
  paisDestinoId: number | null;
  paisDestinoNombre: string | null;
  localidadDestinoId: number | null;
  localidadDestinoNombre: string | null;
  motivoViajeId: number | null;
  motivoViajeNombre: string | null;
  estadoOperativo: EstadoOperativo;
  condicionEntrega: CondicionEntrega;
  creadoAt: string;
  recepcionistaUsername: string | null;
  recepcionistaNombreCompleto: string | null;
}

export interface ParteDiarioCreate {
  habitacionId: string;
  persona: PersonaCreate;
  fechaReporte: string;          // date — si ≠ hoy → FUERA_PLAZO
  paisProcedenciaId: number;
  localidadProcedenciaId?: number; // obligatorio si Bolivia (id=1)
  paisDestinoId?: number;
  localidadDestinoId?: number;     // obligatorio si Bolivia y destino dado
  motivoViajeId?: number;
}

/* ============================================================
 * Movimientos — Cierres Diarios
 * ============================================================ */

export interface CierreDiario {
  id: string;
  establecimientoId: string;
  fechaReporte: string;
  totalRegistros: number;
  totalCheckins: number;
  totalCheckouts: number;
  cerradoPor: string;
  cerradoPorUsername: string | null;
  cerradoPorNombreCompleto: string | null;
  cerradoAt: string;
  observacion?: string;
  condicionEntrega: CondicionEntrega;
}

export interface FechaPendiente {
  fecha: string;
  totalCheckins: number;
  totalCheckouts: number;
}

/* ============================================================
 * Estadísticas
 * ============================================================ */

/** Respuesta del endpoint GET /api/v1/estadisticas/ocupacion */
export interface OcupacionDiaria {
  establecimientoId: string;
  fechaReporte: string;
  totalHuespedes: number;
  capacidadTotal?: number;
  porcentajeOcupacion?: number;
}

/** Respuesta del endpoint GET /api/v1/estadisticas/resumen */
export interface ResumenEstadisticas {
  totalHuespedes: number;
  totalExtranjeros: number;
  ocupacionPromedio: number;
  estadiaPromedioDias: number;
  totalCheckins: number;
  totalCheckouts: number;
  totalPernoctes: number;
  capacidadTotal: number;
  diasConDatos: number;
  totalActivos: number;   // huéspedes activos ahora (sin checkout), independiente del período
  picoOcupacion: number;  // máximo de huéspedes en un solo día del período
}

/** Respuesta del endpoint GET /api/v1/estadisticas/nacionalidades */
export interface NacionalidadStat {
  paisId: number;
  paisNombre: string;
  cantidadIngresos: number;
  porcentaje: number;
}

/** Respuesta del endpoint GET /api/v1/estadisticas/motivos */
export interface MotivoMes {
  motivoId: number | null;
  motivoNombre: string;
  cantidad: number;
}
export interface MotivosPeriodo {
  periodo: string;
  motivos: MotivoMes[];
}

/** Respuesta del endpoint GET /api/v1/estadisticas/tipos-habitacion */
export interface TipoHabitacionStat {
  tipoHabitacion: string;
  totalCamas: number;
  totalOcupadas: number;
  porcentajeOcupacion: number;
  porcentajeDistribucion: number;
}

/* ============================================================
 * Usuarios del Sistema
 * ============================================================ */

export interface UsuarioSistema {
  id: string;
  username: string;
  nombres: string;
  apellidos: string;
  estado: string;
  roles: string[];
  creado_at: string;
}

export interface UsuarioSistemaCreadoResponse {
  usuario: UsuarioSistema;
  password_temporal: string;
  required_actions: string[];
}

export interface UsuarioSistemaCreate {
  username: string;
  nombres: string;
  apellidos: string;
  rol_nombre: string;
}

export interface UsuarioSistemaUpdate {
  nombres?: string;
  apellidos?: string;
  estado?: string;
}

export interface RolSistema {
  id: number;
  nombre: string;
  descripcion?: string;
}

/* ============================================================
 * Auditoría de Sesiones
 * ============================================================ */

export interface SesionAuditoria {
  id: string;
  keycloakEventId: string;
  tipoEvento: "LOGIN" | "LOGOUT" | "LOGIN_ERROR";
  usuarioId: string | null;
  username: string | null;
  nombreCompleto: string;
  rol: string;
  establecimientoId: string;
  realm: string;
  clientId: string | null;
  sesionId: string | null;
  ipAddress: string | null;
  detalle: Record<string, unknown> | null;
  eventoTimestamp: string;
  creadoAt: string;
}

export interface ConectadoInfo {
  usuarioId: string;
  username: string;
  nombreCompleto: string;
  establecimientoId: string;
  clientId: string;
  clientNombre: string;
  sesionId: string;
  ipAddress: string;
  inicioSesion: string;
  tiempoConectado: string;
  roles: string[];
}

export interface ConectadosResponse {
  conectados: ConectadoInfo[];
  total: number;
  consultadoAt: string;
  advertencias: string[] | null;
}

/* ============================================================
 * Auditoría
 * ============================================================ */

export type AuditAccion = "INSERT" | "UPDATE" | "DELETE";

export interface AuditoriaTransaccion {
  id: string;
  timestamp: string;
  usuario: string;
  nombreCompleto: string;
  rol: string;
  establecimientoId: string;
  accion: AuditAccion;
  tabla: string;
  recordId: string;
  ipAddress: string;
  valorAnterior: Record<string, unknown> | null;
  valorNuevo: Record<string, unknown> | null;
  source?: "establecimientos" | "movimientos";
}
