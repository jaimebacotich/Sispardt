/**
 * Mock store mutable — simula el estado del servidor en memoria.
 * Solo se usa cuando NEXT_PUBLIC_MOCK_API=true.
 * Datos alineados con el esquema real de BD Movimientos.
 */
import type {
  ParteDiario,
  ParteDiarioCreate,
  HabitacionEstado,
  PagedResult,
  CierreDiario,
  FechaPendiente,
  CatalogosMovimientos,
  Persona,
} from "@/types/api";

/** Fecha desde la que el sistema comenzó a operar (leída de NEXT_PUBLIC_INICIO_SISTEMA) */
export const INICIO_SISTEMA =
  process.env.NEXT_PUBLIC_INICIO_SISTEMA ?? "2026-03-01";

// ── Catálogos estáticos ──────────────────────────────────────

export const MOCK_CATALOGOS: CatalogosMovimientos = {
  tiposDocumento: [
    { id: 1, sigla: "CI",  descripcion: "Cédula de Identidad" },
    { id: 2, sigla: "PAS", descripcion: "Pasaporte" },
    { id: 3, sigla: "DNI", descripcion: "Documento Nacional de Identidad" },
    { id: 4, sigla: "RUN", descripcion: "Registro Único Nacional" },
    { id: 5, sigla: "CE",  descripcion: "Carnet de Extranjería" },
    { id: 6, sigla: "OTR", descripcion: "Otro" },
  ],
  motivosViaje: [
    { id: 1,  nombre: "Turismo" },
    { id: 2,  nombre: "Negocios" },
    { id: 3,  nombre: "Trabajo" },
    { id: 4,  nombre: "Salud" },
    { id: 5,  nombre: "Educación" },
    { id: 6,  nombre: "Familiar" },
    { id: 7,  nombre: "Deportes" },
    { id: 8,  nombre: "Religión" },
    { id: 9,  nombre: "Tránsito" },
    { id: 10, nombre: "Otro" },
  ],
  paises: [
    { id: 1,  nombre: "Bolivia",        codigoIso: "BOL", esSistema: true },
    { id: 2,  nombre: "Argentina",      codigoIso: "ARG" },
    { id: 3,  nombre: "Brasil",         codigoIso: "BRA" },
    { id: 4,  nombre: "Chile",          codigoIso: "CHL" },
    { id: 5,  nombre: "Colombia",       codigoIso: "COL" },
    { id: 6,  nombre: "Ecuador",        codigoIso: "ECU" },
    { id: 7,  nombre: "Paraguay",       codigoIso: "PRY" },
    { id: 8,  nombre: "Perú",           codigoIso: "PER" },
    { id: 9,  nombre: "Uruguay",        codigoIso: "URY" },
    { id: 10, nombre: "Venezuela",      codigoIso: "VEN" },
    { id: 11, nombre: "Estados Unidos", codigoIso: "USA" },
    { id: 12, nombre: "España",         codigoIso: "ESP" },
    { id: 13, nombre: "Francia",        codigoIso: "FRA" },
    { id: 14, nombre: "Alemania",       codigoIso: "DEU" },
    { id: 15, nombre: "Reino Unido",    codigoIso: "GBR" },
    { id: 16, nombre: "Italia",         codigoIso: "ITA" },
    { id: 17, nombre: "Canadá",         codigoIso: "CAN" },
    { id: 18, nombre: "México",         codigoIso: "MEX" },
    { id: 19, nombre: "Japón",          codigoIso: "JPN" },
    { id: 20, nombre: "China",          codigoIso: "CHN" },
  ],
  divisionesPrincipales: [
    { id: 1, paisId: 1, nombre: "Tarija" },
  ],
  divisionesSecundarias: [
    { id: 1, divisionPrincipalId: 1, nombre: "Cercado" },
    { id: 2, divisionPrincipalId: 1, nombre: "Arce" },
    { id: 3, divisionPrincipalId: 1, nombre: "Gran Chaco" },
    { id: 4, divisionPrincipalId: 1, nombre: "Avilés" },
    { id: 5, divisionPrincipalId: 1, nombre: "Méndez" },
    { id: 6, divisionPrincipalId: 1, nombre: "O'Connor" },
  ],
  localidades: [
    { id: 1,  divisionSecundariaId: 1, nombre: "Tarija" },
    { id: 2,  divisionSecundariaId: 2, nombre: "Padcaya" },
    { id: 3,  divisionSecundariaId: 2, nombre: "Bermejo" },
    { id: 4,  divisionSecundariaId: 3, nombre: "Yacuiba" },
    { id: 5,  divisionSecundariaId: 3, nombre: "Villamontes" },
    { id: 6,  divisionSecundariaId: 3, nombre: "Carapari" },
    { id: 7,  divisionSecundariaId: 4, nombre: "Uriondo" },
    { id: 8,  divisionSecundariaId: 4, nombre: "Yunchar" },
    { id: 9,  divisionSecundariaId: 5, nombre: "San Lorenzo" },
    { id: 10, divisionSecundariaId: 5, nombre: "El Puente" },
    { id: 11, divisionSecundariaId: 6, nombre: "Entre Ríos" },
  ],
};

const ID_BOLIVIA = 1;

// ── Personas mock ────────────────────────────────────────────

const PERSONA_JUAN: Persona = {
  id: "per-00000001", tipoDocumentoId: 1, tipoDocumentoSigla: "CI",
  documentoIdentidad: "12345678", paisOrigenId: 1, paisOrigenNombre: "Bolivia",
  nombre: "Juan", apellidoPaterno: "Pérez", apellidoMaterno: "García",
  fechaNacimiento: "1985-06-15", profesion: "Comerciante", genero: "M",
  creadoAt: "2026-03-09T08:44:00Z",
};
const PERSONA_CARLOS: Persona = {
  id: "per-00000002", tipoDocumentoId: 2, tipoDocumentoSigla: "PAS",
  documentoIdentidad: "AR12345", paisOrigenId: 2, paisOrigenNombre: "Argentina",
  nombre: "Carlos", apellidoPaterno: "López", apellidoMaterno: null,
  fechaNacimiento: "1990-03-20", profesion: "Ingeniero", genero: "M",
  creadoAt: "2026-03-09T10:29:00Z",
};
const PERSONA_MARIA: Persona = {
  id: "per-00000003", tipoDocumentoId: 1, tipoDocumentoSigla: "CI",
  documentoIdentidad: "55443322", paisOrigenId: 1, paisOrigenNombre: "Bolivia",
  nombre: "María", apellidoPaterno: "García", apellidoMaterno: "Quispe",
  fechaNacimiento: "1992-11-08", profesion: "Docente", genero: "F",
  creadoAt: "2026-03-09T08:59:00Z",
};
const PERSONA_PEDRO: Persona = {
  id: "per-00000004", tipoDocumentoId: 2, tipoDocumentoSigla: "PAS",
  documentoIdentidad: "BR99887", paisOrigenId: 3, paisOrigenNombre: "Brasil",
  nombre: "Pedro", apellidoPaterno: "Martínez", apellidoMaterno: "Silva",
  fechaNacimiento: "1978-02-25", profesion: "Empresario", genero: "M",
  creadoAt: "2026-03-09T07:29:00Z",
};
const PERSONA_ANA: Persona = {
  id: "per-00000005", tipoDocumentoId: 1, tipoDocumentoSigla: "CI",
  documentoIdentidad: "87654321", paisOrigenId: 1, paisOrigenNombre: "Bolivia",
  nombre: "Ana", apellidoPaterno: "Rodríguez", apellidoMaterno: "Vega",
  fechaNacimiento: "1995-07-30", profesion: null, genero: "F",
  creadoAt: "2026-03-08T11:04:00Z",
};

// ── Habitaciones iniciales (IDs reales del replica cache) ────

const INIT_HABITACIONES: HabitacionEstado[] = [
  { id: "11111111-1111-1111-1111-111111111101", numero: "101", piso: "1", tipoNombre: "Individual",  capacidad: 1, estado: "libre" },
  { id: "11111111-1111-1111-1111-111111111102", numero: "102", piso: "1", tipoNombre: "Doble",       capacidad: 2, estado: "ocupada",       huespedActual: "Juan Pérez García",    parteActualId: "p-00000001" },
  { id: "11111111-1111-1111-1111-111111111103", numero: "103", piso: "1", tipoNombre: "Matrimonial", capacidad: 2, estado: "libre" },
  { id: "11111111-1111-1111-1111-111111111104", numero: "104", piso: "1", tipoNombre: "Triple",      capacidad: 3, estado: "mantenimiento" },
  { id: "11111111-1111-1111-1111-111111111201", numero: "201", piso: "2", tipoNombre: "Familiar",    capacidad: 4, estado: "ocupada",       huespedActual: "María García Quispe",  parteActualId: "p-00000003" },
  { id: "11111111-1111-1111-1111-111111111202", numero: "202", piso: "2", tipoNombre: "Suite",       capacidad: 2, estado: "libre" },
  { id: "11111111-1111-1111-1111-111111111203", numero: "203", piso: "2", tipoNombre: "Doble",       capacidad: 2, estado: "ocupada",       huespedActual: "Pedro Martínez Silva", parteActualId: "p-00000004" },
];

// ── Partes iniciales ─────────────────────────────────────────

const INIT_PARTES: ParteDiario[] = [
  {
    id: "p-00000001", establecimientoId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    habitacionId: "11111111-1111-1111-1111-111111111102",
    habNroSnapshot: "102", habTipoSnapshot: "Doble", habPisoSnapshot: "1",
    persona: PERSONA_JUAN, fechaReporte: "2026-03-09",
    ingresoAt: "2026-03-09T08:45:00Z", salidaAt: null,
    paisProcedenciaId: 2, paisProcedenciaNombre: "Argentina",
    localidadProcedenciaId: null, localidadProcedenciaNombre: null,
    paisDestinoId: 1, paisDestinoNombre: "Bolivia",
    localidadDestinoId: 1, localidadDestinoNombre: "Tarija",
    motivoViajeId: 2, motivoViajeNombre: "Negocios",
    estadoOperativo: "ACTIVO", condicionEntrega: "DENTRO_PLAZO",
    creadoAt: "2026-03-09T08:45:00Z",
  },
  {
    id: "p-00000002", establecimientoId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    habitacionId: "11111111-1111-1111-1111-111111111101",
    habNroSnapshot: "101", habTipoSnapshot: "Individual", habPisoSnapshot: "1",
    persona: PERSONA_CARLOS, fechaReporte: "2026-03-09",
    ingresoAt: "2026-03-09T07:00:00Z", salidaAt: "2026-03-09T10:15:00Z",
    paisProcedenciaId: 2, paisProcedenciaNombre: "Argentina",
    localidadProcedenciaId: null, localidadProcedenciaNombre: null,
    paisDestinoId: 4, paisDestinoNombre: "Chile",
    localidadDestinoId: null, localidadDestinoNombre: null,
    motivoViajeId: 1, motivoViajeNombre: "Turismo",
    estadoOperativo: "ACTIVO", condicionEntrega: "DENTRO_PLAZO",
    creadoAt: "2026-03-09T07:00:00Z",
  },
  {
    id: "p-00000003", establecimientoId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    habitacionId: "11111111-1111-1111-1111-111111111201",
    habNroSnapshot: "201", habTipoSnapshot: "Familiar", habPisoSnapshot: "2",
    persona: PERSONA_MARIA, fechaReporte: "2026-03-09",
    ingresoAt: "2026-03-09T09:00:00Z", salidaAt: null,
    paisProcedenciaId: 1, paisProcedenciaNombre: "Bolivia",
    localidadProcedenciaId: 11, localidadProcedenciaNombre: "Entre Ríos",
    paisDestinoId: 1, paisDestinoNombre: "Bolivia",
    localidadDestinoId: 1, localidadDestinoNombre: "Tarija",
    motivoViajeId: 4, motivoViajeNombre: "Salud",
    estadoOperativo: "ACTIVO", condicionEntrega: "DENTRO_PLAZO",
    creadoAt: "2026-03-09T09:00:00Z",
  },
  {
    id: "p-00000004", establecimientoId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    habitacionId: "11111111-1111-1111-1111-111111111203",
    habNroSnapshot: "203", habTipoSnapshot: "Doble", habPisoSnapshot: "2",
    persona: PERSONA_PEDRO, fechaReporte: "2026-03-09",
    ingresoAt: "2026-03-09T07:30:00Z", salidaAt: null,
    paisProcedenciaId: 3, paisProcedenciaNombre: "Brasil",
    localidadProcedenciaId: null, localidadProcedenciaNombre: null,
    paisDestinoId: 2, paisDestinoNombre: "Argentina",
    localidadDestinoId: null, localidadDestinoNombre: null,
    motivoViajeId: 2, motivoViajeNombre: "Negocios",
    estadoOperativo: "ACTIVO", condicionEntrega: "DENTRO_PLAZO",
    creadoAt: "2026-03-09T07:30:00Z",
  },
  {
    id: "p-00000005", establecimientoId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    habitacionId: "11111111-1111-1111-1111-111111111103",
    habNroSnapshot: "103", habTipoSnapshot: "Matrimonial", habPisoSnapshot: "1",
    persona: PERSONA_ANA, fechaReporte: "2026-03-08",
    ingresoAt: "2026-03-08T11:05:00Z", salidaAt: "2026-03-09T06:00:00Z",
    paisProcedenciaId: 1, paisProcedenciaNombre: "Bolivia",
    localidadProcedenciaId: 4, localidadProcedenciaNombre: "Yacuiba",
    paisDestinoId: 1, paisDestinoNombre: "Bolivia",
    localidadDestinoId: 1, localidadDestinoNombre: "Tarija",
    motivoViajeId: 6, motivoViajeNombre: "Familiar",
    estadoOperativo: "ACTIVO", condicionEntrega: "FUERA_PLAZO",
    creadoAt: "2026-03-09T06:30:00Z",
  },
];

// ── Cierres seed (fechas ya cerradas al arrancar) ────────────

const EST_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const INIT_CIERRES: CierreDiario[] = [
  {
    id: "cierr-0001", establecimientoId: EST_ID,
    fechaReporte: "2026-03-01", totalRegistros: 3, totalCheckins: 3, totalCheckouts: 1,
    cerradoPor: "María González", cerradoAt: "2026-03-02T08:15:00Z",
    condicionEntrega: "DENTRO_PLAZO",
  },
  {
    id: "cierr-0002", establecimientoId: EST_ID,
    fechaReporte: "2026-03-02", totalRegistros: 2, totalCheckins: 2, totalCheckouts: 2,
    cerradoPor: "María González", cerradoAt: "2026-03-03T09:00:00Z",
    condicionEntrega: "DENTRO_PLAZO",
  },
  {
    id: "cierr-0003", establecimientoId: EST_ID,
    fechaReporte: "2026-03-03", totalRegistros: 1, totalCheckins: 1, totalCheckouts: 0,
    cerradoPor: "María González", cerradoAt: "2026-03-04T07:45:00Z",
    condicionEntrega: "DENTRO_PLAZO",
  },
  {
    id: "cierr-0004", establecimientoId: EST_ID,
    fechaReporte: "2026-03-04", totalRegistros: 0, totalCheckins: 0, totalCheckouts: 0,
    cerradoPor: "María González", cerradoAt: "2026-03-07T14:20:00Z",
    observacion: "Sin Movimiento",
    condicionEntrega: "FUERA_PLAZO",
  },
  {
    id: "cierr-0005", establecimientoId: EST_ID,
    fechaReporte: "2026-03-05", totalRegistros: 4, totalCheckins: 4, totalCheckouts: 2,
    cerradoPor: "María González", cerradoAt: "2026-03-06T08:30:00Z",
    condicionEntrega: "DENTRO_PLAZO",
  },
  // 2026-03-06, 2026-03-07 → pendientes (fuera de plazo)
  // 2026-03-08 → pendiente (cierre actual)
];

// ── Estado mutable ───────────────────────────────────────────

let _habitaciones: HabitacionEstado[] = INIT_HABITACIONES.map((h) => ({ ...h }));
let _partes: ParteDiario[]            = INIT_PARTES.map((p) => ({ ...p }));
const _cierres = new Map<string, CierreDiario>(
  INIT_CIERRES.map((c) => [c.fechaReporte, c])
);

// ── Store público ────────────────────────────────────────────

export const mockStore = {
  catalogs: {
    getAll: (): CatalogosMovimientos => MOCK_CATALOGOS,
  },

  habitaciones: {
    getAll: (): HabitacionEstado[] => [..._habitaciones],
    ocupar(habitacionId: string, huespedNombre: string, parteId: string) {
      _habitaciones = _habitaciones.map((h) =>
        h.id === habitacionId
          ? { ...h, estado: "ocupada" as const, huespedActual: huespedNombre, parteActualId: parteId }
          : h
      );
    },
    liberar(habitacionId: string) {
      _habitaciones = _habitaciones.map((h) =>
        h.id === habitacionId
          ? { ...h, estado: "libre" as const, huespedActual: undefined, parteActualId: undefined }
          : h
      );
    },
  },

  partes: {
    getAll(params?: {
      soloActivos?: boolean;
      soloCheckout?: boolean;
      estadoOperativo?: string;
      fechaReporte?: string;
    }): PagedResult<ParteDiario> {
      let result = [..._partes];
      if (params?.soloActivos)
        result = result.filter((p) => p.salidaAt === null && p.estadoOperativo === "ACTIVO");
      if (params?.soloCheckout)
        result = result.filter((p) => p.salidaAt !== null);
      if (params?.estadoOperativo)
        result = result.filter((p) => p.estadoOperativo === params.estadoOperativo);
      if (params?.fechaReporte)
        result = result.filter((p) => p.fechaReporte === params.fechaReporte);
      result.sort((a, b) => new Date(b.ingresoAt).getTime() - new Date(a.ingresoAt).getTime());
      return { data: result, total: result.length, page: 1, pageSize: 50, totalPages: 1 };
    },

    add(data: ParteDiarioCreate, catalogos: CatalogosMovimientos): ParteDiario {
      const hab      = _habitaciones.find((h) => h.id === data.habitacionId);
      const paisProc = catalogos.paises.find((p) => p.id === data.paisProcedenciaId);
      const locProc  = data.localidadProcedenciaId
        ? catalogos.localidades.find((l) => l.id === data.localidadProcedenciaId) : null;
      const paisDest = data.paisDestinoId
        ? catalogos.paises.find((p) => p.id === data.paisDestinoId) : null;
      const locDest  = data.localidadDestinoId
        ? catalogos.localidades.find((l) => l.id === data.localidadDestinoId) : null;
      const motivo   = data.motivoViajeId
        ? catalogos.motivosViaje.find((m) => m.id === data.motivoViajeId) : null;
      const tipoDoc  = catalogos.tiposDocumento.find((t) => t.id === data.persona.tipoDocumentoId);
      const paisOrig = catalogos.paises.find((p) => p.id === data.persona.paisOrigenId);

      const today = new Date().toISOString().slice(0, 10);
      const condicion: "DENTRO_PLAZO" | "FUERA_PLAZO" =
        data.fechaReporte === today ? "DENTRO_PLAZO" : "FUERA_PLAZO";

      const persona: Persona = {
        id: crypto.randomUUID(),
        tipoDocumentoId: data.persona.tipoDocumentoId,
        tipoDocumentoSigla: tipoDoc?.sigla ?? "?",
        documentoIdentidad: data.persona.documentoIdentidad,
        paisOrigenId: data.persona.paisOrigenId,
        paisOrigenNombre: paisOrig?.nombre ?? "?",
        nombre: data.persona.nombre,
        apellidoPaterno: data.persona.apellidoPaterno,
        apellidoMaterno: data.persona.apellidoMaterno ?? null,
        fechaNacimiento: data.persona.fechaNacimiento,
        profesion: data.persona.profesion ?? null,
        genero: data.persona.genero,
        creadoAt: new Date().toISOString(),
      };

      const newParte: ParteDiario = {
        id: crypto.randomUUID(),
        establecimientoId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        habitacionId: data.habitacionId,
        habNroSnapshot: hab?.numero ?? "?",
        habTipoSnapshot: hab?.tipoNombre ?? "?",
        habPisoSnapshot: hab?.piso ?? "?",
        persona,
        fechaReporte: data.fechaReporte,
        ingresoAt: new Date().toISOString(),
        salidaAt: null,
        paisProcedenciaId: data.paisProcedenciaId,
        paisProcedenciaNombre: paisProc?.nombre ?? "?",
        localidadProcedenciaId: data.localidadProcedenciaId ?? null,
        localidadProcedenciaNombre: locProc?.nombre ?? null,
        paisDestinoId: data.paisDestinoId ?? null,
        paisDestinoNombre: paisDest?.nombre ?? null,
        localidadDestinoId: data.localidadDestinoId ?? null,
        localidadDestinoNombre: locDest?.nombre ?? null,
        motivoViajeId: data.motivoViajeId ?? null,
        motivoViajeNombre: motivo?.nombre ?? null,
        estadoOperativo: "ACTIVO",
        condicionEntrega: condicion,
        creadoAt: new Date().toISOString(),
      };

      _partes = [newParte, ..._partes];
      const nombreCompleto = [persona.nombre, persona.apellidoPaterno, persona.apellidoMaterno]
        .filter(Boolean).join(" ");
      mockStore.habitaciones.ocupar(data.habitacionId, nombreCompleto, newParte.id);
      return newParte;
    },

    checkout(parteId: string): ParteDiario {
      const salidaAt = new Date().toISOString();
      _partes = _partes.map((p) => (p.id === parteId ? { ...p, salidaAt } : p));
      const parte = _partes.find((p) => p.id === parteId)!;
      mockStore.habitaciones.liberar(parte.habitacionId);
      return parte;
    },

    anular(id: string) {
      const parte = _partes.find((p) => p.id === id);
      _partes = _partes.map((p) =>
        p.id === id ? { ...p, estadoOperativo: "ANULADO" as const } : p
      );
      if (parte?.salidaAt === null) mockStore.habitaciones.liberar(parte.habitacionId);
    },
  },

  cierre: {
    getAll(): CierreDiario[] {
      return Array.from(_cierres.values()).sort((a, b) => b.fechaReporte.localeCompare(a.fechaReporte));
    },
    getPorFecha(fecha: string): CierreDiario | null {
      return _cierres.get(fecha) ?? null;
    },
    realizar(fecha: string, observacion?: string): CierreDiario {
      const partesDia = _partes.filter((p) => p.fechaReporte === fecha);
      const totalCheckins  = partesDia.length;
      const totalCheckouts = partesDia.filter((p) => p.salidaAt !== null).length;

      const fechaMs   = new Date(fecha + "T00:00:00Z").getTime();
      const ahoraMs   = Date.now();
      const diffDias  = Math.floor((ahoraMs - fechaMs) / (1000 * 60 * 60 * 24));
      const condicion: "DENTRO_PLAZO" | "FUERA_PLAZO" = diffDias <= 1 ? "DENTRO_PLAZO" : "FUERA_PLAZO";

      const cierre: CierreDiario = {
        id: crypto.randomUUID(),
        establecimientoId: EST_ID,
        fechaReporte: fecha,
        totalRegistros: totalCheckins + totalCheckouts,
        totalCheckins,
        totalCheckouts,
        cerradoPor: "María González",
        cerradoAt: new Date().toISOString(),
        observacion: observacion || undefined,
        condicionEntrega: condicion,
      };
      _cierres.set(fecha, cierre);
      return cierre;
    },
    getFechasPendientes(): FechaPendiente[] {
      const inicio  = new Date(INICIO_SISTEMA + "T00:00:00Z");
      const hoy     = new Date();
      hoy.setUTCHours(0, 0, 0, 0);
      // Fuera de plazo = hasta hoy-2 (hoy-1 corresponde a Cierre Actual)
      const limite  = new Date(hoy);
      limite.setUTCDate(limite.getUTCDate() - 2);

      const pendientes: FechaPendiente[] = [];
      const curr = new Date(inicio);
      while (curr <= limite) {
        const fechaStr = curr.toISOString().slice(0, 10);
        if (!_cierres.has(fechaStr)) {
          const partesDia = _partes.filter((p) => p.fechaReporte === fechaStr);
          pendientes.push({
            fecha: fechaStr,
            totalCheckins:  partesDia.length,
            totalCheckouts: partesDia.filter((p) => p.salidaAt !== null).length,
          });
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
      return pendientes.sort((a, b) => b.fecha.localeCompare(a.fecha));
    },
  },
};

// Exportar ID de Bolivia para uso en componentes
export { ID_BOLIVIA };
