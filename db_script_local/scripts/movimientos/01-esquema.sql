-- ============================================
-- SISPARDT - BD Movimientos
-- 01: Extensiones, Funciones y Esquema
-- ============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS partman;

-- ============================================
-- FUNCIONES
-- ============================================

-- Funcion: Auditar cambios
CREATE OR REPLACE FUNCTION public.fn_auditar_cambios() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_usuario_id   UUID;
    v_ip_origen    INET;
    v_old_data     JSONB := NULL;
    v_new_data     JSONB := NULL;
    v_registro_id  TEXT := NULL;
    v_username     TEXT := '';
    v_first_name   TEXT := '';
    v_last_name    TEXT := '';
BEGIN
    v_usuario_id := COALESCE(
        NULLIF(current_setting('app.current_user_id', true), ''),
        '00000000-0000-0000-0000-000000000000'
    )::UUID;
    v_ip_origen  := NULLIF(current_setting('app.client_ip', true), '')::INET;
    v_username   := COALESCE(NULLIF(current_setting('app.current_username',   true), ''), '');
    v_first_name := COALESCE(NULLIF(current_setting('app.current_first_name', true), ''), '');
    v_last_name  := COALESCE(NULLIF(current_setting('app.current_last_name',  true), ''), '');

    CASE TG_OP
        WHEN 'INSERT' THEN v_new_data := to_jsonb(NEW);
        WHEN 'UPDATE' THEN v_old_data := to_jsonb(OLD); v_new_data := to_jsonb(NEW);
        WHEN 'DELETE' THEN v_old_data := to_jsonb(OLD);
    END CASE;

    v_registro_id := COALESCE(
        v_new_data->>'id', v_old_data->>'id',
        (SELECT string_agg(value, '|') FROM jsonb_each_text(COALESCE(v_new_data, v_old_data)) WHERE key LIKE '%_id')
    );

    INSERT INTO public.auditoria_transacciones (
        tabla_afectada, accion, valor_anterior, valor_nuevo,
        keycloak_usuario_id, ip_origen, registro_id,
        usuario_username, usuario_nombre, usuario_apellido
    ) VALUES (TG_TABLE_NAME, TG_OP, v_old_data, v_new_data, v_usuario_id, v_ip_origen, v_registro_id,
              v_username, v_first_name, v_last_name);

    IF (TG_OP = 'DELETE') THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

-- Funcion: Bloquear modificacion si el dia esta cerrado
CREATE OR REPLACE FUNCTION public.fn_bloquear_modificacion_si_cerrado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.cierres_diarios c
        WHERE c.establecimiento_id = NEW.establecimiento_id
          AND c.fecha_reporte = NEW.fecha_reporte
    ) THEN
        RAISE EXCEPTION 'Operacion rechazada: La fecha de destino (%) ya se encuentra en estado cerrado.', NEW.fecha_reporte;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF EXISTS (
            SELECT 1 FROM public.cierres_diarios c
            WHERE c.establecimiento_id = OLD.establecimiento_id
              AND c.fecha_reporte = OLD.fecha_reporte
        ) THEN
            RAISE EXCEPTION 'Operacion rechazada: No se puede alterar un registro que pertenece a una fecha origen (%) que ya fue cerrada.', OLD.fecha_reporte;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Funcion: Impedir alteracion de auditoria
CREATE OR REPLACE FUNCTION public.fn_impedir_alteracion_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Violacion de Integridad: Los registros de auditoria son inmutables.';
    RETURN NULL;
END;
$$;

-- Funcion: Proteger anulacion de parte cerrado
CREATE OR REPLACE FUNCTION public.fn_proteger_anulacion_parte_cerrado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado_operativo = 'ANULADO' AND OLD.estado_operativo = 'ACTIVO' THEN
        IF EXISTS (
            SELECT 1 FROM public.cierres_diarios c
            WHERE c.establecimiento_id = OLD.establecimiento_id
              AND c.fecha_reporte = OLD.fecha_reporte
        ) THEN
            RAISE EXCEPTION 'Auditoria: No se puede anular un parte diario de una fecha (%) que ya cuenta con cierre definitivo.', OLD.fecha_reporte;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Funcion: Validar capacidad de habitacion (consistencia eventual con replica)
CREATE OR REPLACE FUNCTION public.validar_capacidad_habitacion() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_capacidad_maxima INT;
    v_ocupacion_actual INT;
BEGIN
    SELECT capacidad_calculada INTO v_capacidad_maxima
    FROM public.habitaciones_replica_cache
    WHERE habitacion_id = NEW.habitacion_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE WARNING 'Habitacion % no encontrada en replica. Validacion de capacidad pospuesta por consistencia eventual.', NEW.habitacion_id;
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_ocupacion_actual
    FROM public.partes_diarios
    WHERE habitacion_id = NEW.habitacion_id
      AND salida_at IS NULL;

    IF (v_ocupacion_actual >= v_capacidad_maxima) THEN
        RAISE EXCEPTION 'Capacidad maxima de la habitacion superada. Ocupacion actual: %, Limite: %', v_ocupacion_actual, v_capacidad_maxima;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- TABLAS
-- ============================================

-- Auditoria (particionada)
CREATE TABLE public.auditoria_transacciones (
    id bigint NOT NULL,
    tabla_afectada character varying(50) NOT NULL,
    accion character varying(20) NOT NULL,
    valor_anterior jsonb,
    valor_nuevo jsonb,
    keycloak_usuario_id uuid NOT NULL,
    ip_origen inet,
    creado_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    registro_id character varying(255),
    usuario_username character varying(150),
    usuario_nombre character varying(150),
    usuario_apellido character varying(150)
) PARTITION BY RANGE (creado_at);

CREATE SEQUENCE public.auditoria_transacciones_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.auditoria_transacciones_id_seq OWNED BY public.auditoria_transacciones.id;
ALTER TABLE ONLY public.auditoria_transacciones ALTER COLUMN id SET DEFAULT nextval('public.auditoria_transacciones_id_seq'::regclass);

CREATE TABLE public.auditoria_transacciones_default PARTITION OF public.auditoria_transacciones DEFAULT;
CREATE TABLE public.auditoria_transacciones_p20260301 PARTITION OF public.auditoria_transacciones FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE public.auditoria_transacciones_p20260401 PARTITION OF public.auditoria_transacciones FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE public.auditoria_transacciones_p20260501 PARTITION OF public.auditoria_transacciones FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE public.auditoria_transacciones_p20260601 PARTITION OF public.auditoria_transacciones FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE public.auditoria_transacciones_p20260701 PARTITION OF public.auditoria_transacciones FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE public.auditoria_transacciones_p20260801 PARTITION OF public.auditoria_transacciones FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE public.auditoria_transacciones_p20260901 PARTITION OF public.auditoria_transacciones FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Tipos Documento
CREATE TABLE public.tipos_documento (
    id serial PRIMARY KEY,
    sigla character varying(10) NOT NULL UNIQUE,
    descripcion character varying(50) NOT NULL,
    eliminado_at timestamp with time zone
);

-- Motivos Viaje
CREATE TABLE public.motivos_viaje (
    id serial PRIMARY KEY,
    nombre character varying(50) NOT NULL UNIQUE
);

-- Personas
CREATE TABLE public.personas (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tipo_documento_id integer REFERENCES public.tipos_documento(id) ON DELETE SET NULL,
    documento_identidad character varying(30) NOT NULL,
    pais_origen_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido_paterno character varying(100) NOT NULL,
    apellido_materno character varying(100),
    fecha_nacimiento date NOT NULL,
    profesion character varying(100),
    creado_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT persona_documento_unico UNIQUE (tipo_documento_id, documento_identidad)
);

-- Replicas Cache (datos de establecimientos via Debezium/Kafka)
CREATE TABLE public.paises_replica_cache (
    id integer NOT NULL PRIMARY KEY,
    nombre character varying(150) NOT NULL,
    eliminado_at timestamp with time zone,
    es_sistema boolean,
    codigo_iso character varying(3) NOT NULL UNIQUE
);

CREATE TABLE public.divisiones_principales_replica_cache (
    id integer NOT NULL PRIMARY KEY,
    pais_id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    eliminado_at timestamp with time zone,
    es_sistema boolean
);

CREATE TABLE public.divisiones_secundarias_replica_cache (
    id integer NOT NULL PRIMARY KEY,
    division_principal_id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    eliminado_at timestamp with time zone,
    es_sistema boolean
);

CREATE TABLE public.localidades_replica_cache (
    id integer NOT NULL PRIMARY KEY,
    division_secundaria_id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    eliminado_at timestamp with time zone,
    es_sistema boolean
);

CREATE TABLE public.habitaciones_replica_cache (
    habitacion_id uuid NOT NULL PRIMARY KEY,
    establecimiento_id uuid NOT NULL,
    nro_habitacion character varying(20) NOT NULL,
    tipo_habitacion_id integer,
    tipo_habitacion character varying(50) NOT NULL,
    capacidad_calculada integer NOT NULL,
    estado_actual character varying(20) NOT NULL,
    piso character varying(20),
    eliminado_at timestamp with time zone,
    actualizado_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT replica_capacidad_positiva CHECK (capacidad_calculada >= 0)
);

-- Partes Diarios
CREATE TABLE public.partes_diarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    establecimiento_id uuid NOT NULL,
    habitacion_id uuid NOT NULL REFERENCES public.habitaciones_replica_cache(habitacion_id) ON DELETE RESTRICT,
    persona_id uuid REFERENCES public.personas(id) ON DELETE RESTRICT,
    fecha_reporte date NOT NULL,
    ingreso_at timestamp with time zone NOT NULL,
    salida_at timestamp with time zone,
    pais_procedencia_id integer REFERENCES public.paises_replica_cache(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    localidad_procedencia_id integer REFERENCES public.localidades_replica_cache(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    pais_destino_id integer REFERENCES public.paises_replica_cache(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    localidad_destino_id integer REFERENCES public.localidades_replica_cache(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    motivo_viaje_id integer REFERENCES public.motivos_viaje(id) ON DELETE SET NULL,
    keycloak_recepcionista_id uuid NOT NULL,
    recepcionista_username character varying(100),
    recepcionista_nombre character varying(100),
    recepcionista_apellido character varying(100),
    hab_nro_snapshot character varying(10),
    hab_tipo_snapshot character varying(50),
    hab_piso_snapshot character varying(20),
    estado_operativo character varying(20) DEFAULT 'ACTIVO',
    condicion_entrega character varying(20) DEFAULT 'DENTRO_PLAZO',
    creado_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT parte_unico_persona_ingreso UNIQUE (persona_id, ingreso_at),
    CONSTRAINT partes_fechas_validas CHECK (salida_at IS NULL OR salida_at >= ingreso_at),
    CONSTRAINT chk_estado_operativo CHECK (estado_operativo IN ('ACTIVO', 'ANULADO')),
    CONSTRAINT chk_condicion_entrega CHECK (condicion_entrega IN ('DENTRO_PLAZO', 'FUERA_PLAZO')),
    CONSTRAINT chk_coherencia_geografica_procedencia CHECK ((pais_procedencia_id <> 1 AND localidad_procedencia_id IS NULL) OR (pais_procedencia_id = 1 AND localidad_procedencia_id IS NOT NULL)),
    CONSTRAINT chk_coherencia_geografica_destino CHECK ((pais_destino_id <> 1 AND localidad_destino_id IS NULL) OR (pais_destino_id = 1 AND localidad_destino_id IS NOT NULL))
);

ALTER TABLE ONLY public.partes_diarios REPLICA IDENTITY FULL;

-- Cierres Diarios
CREATE TABLE public.cierres_diarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    establecimiento_id uuid NOT NULL,
    fecha_reporte date NOT NULL,
    total_registros integer NOT NULL DEFAULT 0,
    total_checkins integer NOT NULL DEFAULT 0,
    total_checkouts integer NOT NULL DEFAULT 0,
    cerrado_por uuid NOT NULL,
    cerrado_por_username character varying(100),
    cerrado_por_nombre character varying(100),
    cerrado_por_apellido character varying(100),
    cerrado_at timestamp with time zone DEFAULT now() NOT NULL,
    observacion text,
    condicion_entrega text NOT NULL DEFAULT 'DENTRO_PLAZO',
    CONSTRAINT unique_cierre_por_dia UNIQUE (establecimiento_id, fecha_reporte),
    CONSTRAINT chk_condicion_entrega_cierre CHECK (condicion_entrega IN ('DENTRO_PLAZO', 'FUERA_PLAZO'))
);

-- Outbox Events (patron Transactional Outbox para Debezium)
CREATE TABLE public.outbox_events (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    aggregate_type character varying(50) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    payload jsonb NOT NULL,
    estado character varying(20) DEFAULT 'PENDING',
    creado_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    procesado_at timestamp with time zone,
    retry_count integer DEFAULT 0,
    last_retry_at timestamp with time zone,
    CONSTRAINT outbox_evento_unico UNIQUE (aggregate_id, event_type, creado_at)
);

ALTER TABLE ONLY public.outbox_events REPLICA IDENTITY FULL;

-- ============================================
-- VISTAS ESTADISTICAS
-- ============================================

CREATE VIEW public.vw_capacidad_establecimiento AS
    SELECT establecimiento_id, sum(capacidad_calculada) AS capacidad_total
    FROM public.habitaciones_replica_cache
    GROUP BY establecimiento_id;

CREATE VIEW public.vw_estadistica_ingresos AS
    SELECT pd.establecimiento_id, pd.fecha_reporte,
        p.id AS pais_id, p.nombre AS pais_nombre,
        dp.id AS division_principal_id, dp.nombre AS division_principal_nombre,
        ds.id AS division_secundaria_id, ds.nombre AS division_secundaria_nombre,
        l.id AS localidad_id, l.nombre AS localidad_nombre,
        count(*) AS cantidad_ingresos
    FROM public.partes_diarios pd
    JOIN public.paises_replica_cache p ON pd.pais_procedencia_id = p.id
    LEFT JOIN public.localidades_replica_cache l ON pd.localidad_procedencia_id = l.id
    LEFT JOIN public.divisiones_secundarias_replica_cache ds ON l.division_secundaria_id = ds.id
    LEFT JOIN public.divisiones_principales_replica_cache dp ON ds.division_principal_id = dp.id
    WHERE pd.ingreso_at >= pd.fecha_reporte AND pd.ingreso_at < (pd.fecha_reporte + '1 day'::interval)
    GROUP BY pd.establecimiento_id, pd.fecha_reporte, p.id, p.nombre, dp.id, dp.nombre, ds.id, ds.nombre, l.id, l.nombre;

CREATE VIEW public.vw_estadistica_pernocte AS
    SELECT pd.establecimiento_id, pd.fecha_reporte,
        p.id AS pais_id, p.nombre AS pais_nombre,
        dp.id AS division_principal_id, dp.nombre AS division_principal_nombre,
        ds.id AS division_secundaria_id, ds.nombre AS division_secundaria_nombre,
        l.id AS localidad_id, l.nombre AS localidad_nombre,
        count(*) AS cantidad_pernocte
    FROM public.partes_diarios pd
    JOIN public.paises_replica_cache p ON pd.pais_procedencia_id = p.id
    LEFT JOIN public.localidades_replica_cache l ON pd.localidad_procedencia_id = l.id
    LEFT JOIN public.divisiones_secundarias_replica_cache ds ON l.division_secundaria_id = ds.id
    LEFT JOIN public.divisiones_principales_replica_cache dp ON ds.division_principal_id = dp.id
    WHERE pd.ingreso_at < (pd.fecha_reporte + '1 day'::interval)
      AND (pd.salida_at IS NULL OR pd.salida_at >= (pd.fecha_reporte + '1 day'::interval))
    GROUP BY pd.establecimiento_id, pd.fecha_reporte, p.id, p.nombre, dp.id, dp.nombre, ds.id, ds.nombre, l.id, l.nombre;

CREATE VIEW public.vw_estadistica_consolidada AS
    SELECT COALESCE(i.establecimiento_id, p.establecimiento_id) AS establecimiento_id,
        COALESCE(i.fecha_reporte, p.fecha_reporte) AS fecha_reporte,
        COALESCE(i.pais_id, p.pais_id) AS pais_id, COALESCE(i.pais_nombre, p.pais_nombre) AS pais_nombre,
        COALESCE(i.division_principal_id, p.division_principal_id) AS division_principal_id,
        COALESCE(i.division_principal_nombre, p.division_principal_nombre) AS division_principal_nombre,
        COALESCE(i.division_secundaria_id, p.division_secundaria_id) AS division_secundaria_id,
        COALESCE(i.division_secundaria_nombre, p.division_secundaria_nombre) AS division_secundaria_nombre,
        COALESCE(i.localidad_id, p.localidad_id) AS localidad_id,
        COALESCE(i.localidad_nombre, p.localidad_nombre) AS localidad_nombre,
        COALESCE(i.cantidad_ingresos, 0::bigint) AS cantidad_ingresos,
        COALESCE(p.cantidad_pernocte, 0::bigint) AS cantidad_pernocte
    FROM public.vw_estadistica_ingresos i
    FULL JOIN public.vw_estadistica_pernocte p ON i.establecimiento_id = p.establecimiento_id
        AND i.fecha_reporte = p.fecha_reporte AND i.pais_id = p.pais_id
        AND NOT (i.localidad_id IS DISTINCT FROM p.localidad_id);

CREATE VIEW public.vw_ocupacion_diaria AS
    SELECT establecimiento_id, fecha_reporte, count(*) AS total_huespedes
    FROM public.partes_diarios
    WHERE ingreso_at < (fecha_reporte + '1 day'::interval)
      AND (salida_at IS NULL OR salida_at >= (fecha_reporte + '1 day'::interval))
    GROUP BY establecimiento_id, fecha_reporte;

CREATE VIEW public.vw_dias_no_cerrados AS
    SELECT pd.establecimiento_id, pd.fecha_reporte
    FROM public.partes_diarios pd
    LEFT JOIN public.cierres_diarios cd ON pd.establecimiento_id = cd.establecimiento_id AND pd.fecha_reporte = cd.fecha_reporte
    WHERE cd.id IS NULL
    GROUP BY pd.establecimiento_id, pd.fecha_reporte;

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX idx_audit_tabla_fecha ON ONLY public.auditoria_transacciones USING btree (tabla_afectada, creado_at);
CREATE INDEX idx_audit_usuario ON ONLY public.auditoria_transacciones USING btree (keycloak_usuario_id);

CREATE INDEX idx_partes_diarios_establecimiento_id ON public.partes_diarios USING btree (establecimiento_id);
CREATE INDEX idx_partes_diarios_fecha_reporte ON public.partes_diarios USING btree (fecha_reporte);
CREATE INDEX idx_partes_diarios_ingreso_at ON public.partes_diarios USING btree (ingreso_at);
CREATE INDEX idx_partes_diarios_habitacion_id ON public.partes_diarios USING btree (habitacion_id);
CREATE INDEX idx_partes_diarios_persona_id ON public.partes_diarios USING btree (persona_id);
CREATE INDEX idx_partes_diarios_motivo_viaje_id ON public.partes_diarios USING btree (motivo_viaje_id);
CREATE INDEX idx_partes_establecimiento_fecha ON public.partes_diarios USING btree (establecimiento_id, fecha_reporte);
CREATE INDEX idx_partes_establecimiento_ingreso ON public.partes_diarios USING btree (establecimiento_id, ingreso_at);
CREATE INDEX idx_partes_pais_procedencia ON public.partes_diarios USING btree (pais_procedencia_id);
CREATE INDEX idx_partes_salida_at ON public.partes_diarios USING btree (salida_at);
CREATE INDEX idx_partes_diarios_ocupacion_activa ON public.partes_diarios USING btree (habitacion_id) WHERE (salida_at IS NULL);
CREATE INDEX idx_partes_diarios_entregas_tardias ON public.partes_diarios USING btree (establecimiento_id, fecha_reporte) WHERE (condicion_entrega = 'FUERA_PLAZO');
CREATE UNIQUE INDEX ux_persona_ingreso_activo ON public.partes_diarios USING btree (persona_id) WHERE (salida_at IS NULL);

CREATE INDEX idx_hab_cache_establecimiento ON public.habitaciones_replica_cache USING btree (establecimiento_id);
CREATE INDEX idx_replica_estado ON public.habitaciones_replica_cache USING btree (estado_actual);
CREATE INDEX idx_outbox_pending_events ON public.outbox_events USING btree (creado_at) WHERE (estado = 'PENDING');

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER tr_audit_personas AFTER INSERT OR DELETE OR UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_partes AFTER INSERT OR DELETE OR UPDATE ON public.partes_diarios FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_tipos_documento AFTER INSERT OR DELETE OR UPDATE ON public.tipos_documento FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_motivos_viaje AFTER INSERT OR DELETE OR UPDATE ON public.motivos_viaje FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER trg_auditar_cierres_diarios AFTER INSERT OR DELETE OR UPDATE ON public.cierres_diarios FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();

CREATE TRIGGER tr_bloqueo_por_cierre BEFORE DELETE OR UPDATE ON public.partes_diarios FOR EACH ROW EXECUTE FUNCTION public.fn_bloquear_modificacion_si_cerrado();
CREATE TRIGGER tr_validar_capacidad_habitacion BEFORE INSERT ON public.partes_diarios FOR EACH ROW EXECUTE FUNCTION public.validar_capacidad_habitacion();
CREATE TRIGGER trg_check_anulacion_parte BEFORE UPDATE ON public.partes_diarios FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_anulacion_parte_cerrado();
CREATE TRIGGER trg_inmutabilidad_auditoria BEFORE DELETE OR UPDATE ON public.auditoria_transacciones FOR EACH ROW EXECUTE FUNCTION public.fn_impedir_alteracion_auditoria();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.partes_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitaciones_replica_cache ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PUBLICACION CDC (Debezium)
-- ============================================
CREATE PUBLICATION pardt_movimiento_pub WITH (publish = 'insert, update, delete, truncate');
ALTER PUBLICATION pardt_movimiento_pub ADD TABLE ONLY public.outbox_events;
ALTER PUBLICATION pardt_movimiento_pub ADD TABLE ONLY public.partes_diarios;
