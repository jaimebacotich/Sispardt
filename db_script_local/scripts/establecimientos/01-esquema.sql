-- ============================================
-- SISPARDT - BD Establecimientos
-- 01: Extensiones y Funciones
-- ============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Schema para pg_partman (se cargara cuando se instale la extension)
CREATE SCHEMA IF NOT EXISTS partman;

-- ============================================
-- FUNCIONES
-- ============================================

-- Funcion: Calcular capacidad de una habitacion
CREATE OR REPLACE FUNCTION public.calcular_capacidad_habitacion(p_habitacion_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_capacidad INTEGER;
BEGIN
    SELECT COALESCE(SUM(tc.capacidad_personas * hc.cantidad), 0)
    INTO v_capacidad
    FROM public.habitacion_camas hc
    JOIN public.tipo_camas tc ON tc.id = hc.tipo_cama_id
    WHERE hc.habitacion_id = p_habitacion_id
      AND hc.eliminado_at IS NULL
      AND tc.eliminado_at IS NULL;

    RETURN v_capacidad;
END;
$$;

-- Funcion: Auditar cambios (trigger generico)
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
        v_new_data->>'id',
        v_old_data->>'id',
        (
            SELECT string_agg(value, '|')
            FROM jsonb_each_text(COALESCE(v_new_data, v_old_data))
            WHERE key LIKE '%_id'
        )
    );

    INSERT INTO public.auditoria_transacciones (
        tabla_afectada, accion, valor_anterior, valor_nuevo,
        keycloak_usuario_id, ip_origen, registro_id,
        usuario_username, usuario_nombre, usuario_apellido
    ) VALUES (
        TG_TABLE_NAME, TG_OP, v_old_data, v_new_data,
        v_usuario_id, v_ip_origen, v_registro_id,
        v_username, v_first_name, v_last_name
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- Funcion: Impedir alteracion de registros de auditoria
CREATE OR REPLACE FUNCTION public.fn_impedir_alteracion_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Violacion de Integridad: Los registros de auditoria son inmutables.';
    RETURN NULL;
END;
$$;

-- Funcion: Proteger borrado logico de categoria
CREATE OR REPLACE FUNCTION public.fn_proteger_borrado_logico_categoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_dependencias INT;
BEGIN
    IF NEW.eliminado_at IS NOT NULL AND OLD.eliminado_at IS NULL THEN
        SELECT COUNT(*) INTO v_dependencias
        FROM public.establecimientos
        WHERE categoria_id = OLD.id
          AND eliminado_at IS NULL;

        IF v_dependencias > 0 THEN
            RAISE EXCEPTION 'Violacion de Integridad Logica: No se puede dar de baja la categoria. Existen % establecimientos activos vinculados.', v_dependencias;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Funcion: Proteger borrado logico de tipo habitacion
CREATE OR REPLACE FUNCTION public.fn_proteger_borrado_logico_tipo_habitacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_dependencias INT;
BEGIN
    IF NEW.eliminado_at IS NOT NULL AND OLD.eliminado_at IS NULL THEN
        SELECT COUNT(*) INTO v_dependencias
        FROM public.habitaciones
        WHERE tipo_habitacion_id = OLD.id
          AND eliminado_at IS NULL;

        IF v_dependencias > 0 THEN
            RAISE EXCEPTION 'Violacion de Integridad Logica: No se puede eliminar el Tipo de Habitacion. Existen % habitaciones activas vinculadas.', v_dependencias;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Funcion: Validar que la categoria este activa
CREATE OR REPLACE FUNCTION public.fn_validar_categoria_activa() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.categorias
        WHERE id = NEW.categoria_id AND eliminado_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'No se puede vincular a una categoria eliminada logicamente.';
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================
-- TABLAS
-- ============================================

-- Auditoria (particionada por mes)
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

-- Particion default
CREATE TABLE public.auditoria_transacciones_default PARTITION OF public.auditoria_transacciones DEFAULT;

-- Particiones mensuales (marzo-septiembre 2026)
CREATE TABLE public.auditoria_transacciones_p20260301 PARTITION OF public.auditoria_transacciones
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE public.auditoria_transacciones_p20260401 PARTITION OF public.auditoria_transacciones
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE public.auditoria_transacciones_p20260501 PARTITION OF public.auditoria_transacciones
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE public.auditoria_transacciones_p20260601 PARTITION OF public.auditoria_transacciones
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE public.auditoria_transacciones_p20260701 PARTITION OF public.auditoria_transacciones
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE public.auditoria_transacciones_p20260801 PARTITION OF public.auditoria_transacciones
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE public.auditoria_transacciones_p20260901 PARTITION OF public.auditoria_transacciones
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Clasificaciones
CREATE TABLE public.clasificaciones (
    id serial PRIMARY KEY,
    nombre character varying(50) NOT NULL UNIQUE,
    eliminado_at timestamp with time zone
);

-- Categorias
CREATE TABLE public.categorias (
    id serial PRIMARY KEY,
    clasificacion_id integer REFERENCES public.clasificaciones(id),
    nombre character varying(50) NOT NULL,
    eliminado_at timestamp with time zone
);

-- Paises
CREATE TABLE public.paises (
    id serial PRIMARY KEY,
    nombre character varying(100) NOT NULL UNIQUE,
    codigo_iso character varying(3) NOT NULL UNIQUE,
    eliminado_at timestamp with time zone,
    es_sistema boolean DEFAULT false NOT NULL
);

-- Divisiones Principales (Departamentos)
CREATE TABLE public.divisiones_principales (
    id serial PRIMARY KEY,
    pais_id integer REFERENCES public.paises(id) ON DELETE CASCADE,
    nombre character varying(100) NOT NULL,
    eliminado_at timestamp with time zone,
    es_sistema boolean DEFAULT false NOT NULL
);

-- Divisiones Secundarias (Provincias)
CREATE TABLE public.divisiones_secundarias (
    id serial PRIMARY KEY,
    division_principal_id integer REFERENCES public.divisiones_principales(id) ON DELETE RESTRICT,
    nombre character varying(100) NOT NULL,
    eliminado_at timestamp with time zone,
    es_sistema boolean DEFAULT false NOT NULL
);

-- Localidades (Municipios)
CREATE TABLE public.localidades (
    id serial PRIMARY KEY,
    division_secundaria_id integer REFERENCES public.divisiones_secundarias(id) ON DELETE RESTRICT,
    nombre character varying(100) NOT NULL,
    eliminado_at timestamp with time zone,
    es_sistema boolean DEFAULT false NOT NULL
);

-- Establecimientos
CREATE TABLE public.establecimientos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nro_licencia character varying(20) UNIQUE,
    razon_social character varying(150) NOT NULL,
    propietario character varying(150) NOT NULL,
    localidad_id integer REFERENCES public.localidades(id) ON DELETE RESTRICT,
    categoria_id integer REFERENCES public.categorias(id),
    tiene_licencia_vigente boolean DEFAULT false,
    fecha_vencimiento_licencia date,
    direccion text NOT NULL,
    latitud numeric(10,8),
    longitud numeric(11,8),
    telefono character varying(50),
    email character varying(100),
    estado_admin character varying(20) DEFAULT 'ACTIVO',
    creado_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    eliminado_at timestamp with time zone
);

-- Tipo Habitaciones
CREATE TABLE public.tipo_habitaciones (
    id serial PRIMARY KEY,
    nombre character varying(50) NOT NULL,
    eliminado_at timestamp with time zone
);

-- Tipo Camas
CREATE TABLE public.tipo_camas (
    id serial PRIMARY KEY,
    nombre character varying(50) NOT NULL,
    capacidad_personas integer NOT NULL,
    eliminado_at timestamp with time zone
);

-- Habitaciones
CREATE TABLE public.habitaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    establecimiento_id uuid REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    tipo_habitacion_id integer REFERENCES public.tipo_habitaciones(id),
    nro_habitacion character varying(10) NOT NULL,
    piso character varying(20),
    tiene_bano_privado boolean DEFAULT true,
    estado_hab character varying(20) DEFAULT 'SERVICIO',
    creado_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    eliminado_at timestamp with time zone,
    CONSTRAINT habitaciones_unicas_por_establecimiento UNIQUE (establecimiento_id, nro_habitacion),
    CONSTRAINT chk_habitaciones_piso_no_vacio CHECK ((piso IS NULL) OR (length(TRIM(BOTH FROM piso)) > 0))
);

-- Habitacion Camas
CREATE TABLE public.habitacion_camas (
    id serial PRIMARY KEY,
    habitacion_id uuid REFERENCES public.habitaciones(id) ON DELETE CASCADE,
    tipo_cama_id integer REFERENCES public.tipo_camas(id),
    cantidad integer DEFAULT 1 NOT NULL,
    eliminado_at timestamp with time zone,
    CONSTRAINT habitacion_tipo_cama_unico UNIQUE (habitacion_id, tipo_cama_id),
    CONSTRAINT habitacion_camas_cantidad_positiva CHECK (cantidad > 0),
    CONSTRAINT habitacion_camas_cantidad_maxima CHECK (cantidad <= 20)
);

-- Tipo Personal
CREATE TABLE public.tipo_personal (
    id serial PRIMARY KEY,
    nombre character varying(50) NOT NULL
);

-- Personal
CREATE TABLE public.personal (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    establecimiento_id uuid REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    tipo_personal_id integer REFERENCES public.tipo_personal(id),
    nombres          character varying(60)  NOT NULL DEFAULT '',
    apellidos        character varying(60)  NOT NULL DEFAULT '',
    nombre_completo  character varying(121) GENERATED ALWAYS AS (nombres || ' ' || apellidos) STORED,
    documento_identidad character varying(20) UNIQUE,
    telefono         character varying(20),
    activo           boolean DEFAULT true,
    usuario_sistema  boolean NOT NULL DEFAULT false,
    keycloak_user_id uuid,
    eliminado_at     timestamp with time zone
);

-- Servicios
CREATE TABLE public.servicios (
    id serial PRIMARY KEY,
    nombre character varying(50) NOT NULL,
    eliminado_at timestamp with time zone
);

-- Establecimiento Servicios (muchos a muchos)
CREATE TABLE public.establecimiento_servicios (
    establecimiento_id uuid NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    servicio_id integer NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
    eliminado_at timestamp with time zone,
    CONSTRAINT establecimiento_servicio_unico UNIQUE (establecimiento_id, servicio_id)
);

-- ============================================
-- INDICES
-- ============================================

-- Auditoria
CREATE INDEX idx_audit_tabla_fecha ON ONLY public.auditoria_transacciones USING btree (tabla_afectada, creado_at);
CREATE INDEX idx_audit_usuario ON ONLY public.auditoria_transacciones USING btree (keycloak_usuario_id);
CREATE INDEX idx_audit_registro_id ON ONLY public.auditoria_transacciones USING btree (registro_id);

-- Establecimientos
CREATE INDEX idx_establecimientos_localidad ON public.establecimientos USING btree (localidad_id);
CREATE INDEX idx_establecimientos_categoria ON public.establecimientos USING btree (categoria_id);
CREATE INDEX idx_establecimientos_activos ON public.establecimientos USING btree (id) WHERE (eliminado_at IS NULL);

-- Habitaciones
CREATE INDEX idx_habitaciones_establecimiento_id ON public.habitaciones USING btree (establecimiento_id);
CREATE INDEX idx_habitaciones_tipo ON public.habitaciones USING btree (tipo_habitacion_id);
CREATE INDEX idx_habitaciones_activas ON public.habitaciones USING btree (establecimiento_id) WHERE (eliminado_at IS NULL);

-- Habitacion Camas
CREATE INDEX idx_habitacion_camas_habitacion_id ON public.habitacion_camas USING btree (habitacion_id);
CREATE INDEX idx_habitacion_camas_tipo_cama_id ON public.habitacion_camas USING btree (tipo_cama_id);
CREATE INDEX idx_habitacion_camas_activas ON public.habitacion_camas USING btree (habitacion_id) WHERE (eliminado_at IS NULL);

-- Categorias
CREATE INDEX idx_categorias_activas ON public.categorias USING btree (id) WHERE (eliminado_at IS NULL);

-- Localidades
CREATE INDEX idx_localidades_division_sec_id ON public.localidades USING btree (division_secundaria_id);
CREATE INDEX idx_localidades_activas ON public.localidades USING btree (id) WHERE (eliminado_at IS NULL);

-- Personal
CREATE INDEX idx_personal_establecimiento_id ON public.personal USING btree (establecimiento_id);
CREATE INDEX idx_personal_tipo_personal_id ON public.personal USING btree (tipo_personal_id);
CREATE INDEX idx_personal_activo ON public.personal USING btree (establecimiento_id) WHERE (eliminado_at IS NULL);
CREATE INDEX idx_personal_nombre_completo ON public.personal USING btree (nombre_completo) WHERE (eliminado_at IS NULL);

-- Establecimiento Servicios
CREATE INDEX idx_est_servicios_activos ON public.establecimiento_servicios USING btree (establecimiento_id) WHERE (eliminado_at IS NULL);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auditoria en todas las tablas
CREATE TRIGGER tr_audit_clasificaciones AFTER INSERT OR DELETE OR UPDATE ON public.clasificaciones FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_categorias AFTER INSERT OR DELETE OR UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_paises AFTER INSERT OR DELETE OR UPDATE ON public.paises FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_divisiones_principales AFTER INSERT OR DELETE OR UPDATE ON public.divisiones_principales FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_divisiones_secundarias AFTER INSERT OR DELETE OR UPDATE ON public.divisiones_secundarias FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_localidades AFTER INSERT OR DELETE OR UPDATE ON public.localidades FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_establecimientos AFTER INSERT OR DELETE OR UPDATE ON public.establecimientos FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_tipo_habitaciones AFTER INSERT OR DELETE OR UPDATE ON public.tipo_habitaciones FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_tipo_camas AFTER INSERT OR DELETE OR UPDATE ON public.tipo_camas FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_habitaciones_det AFTER INSERT OR DELETE OR UPDATE ON public.habitaciones FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_habitacion_camas AFTER INSERT OR DELETE OR UPDATE ON public.habitacion_camas FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_tipo_personal AFTER INSERT OR DELETE OR UPDATE ON public.tipo_personal FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_personal AFTER INSERT OR DELETE OR UPDATE ON public.personal FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_servicios AFTER INSERT OR DELETE OR UPDATE ON public.servicios FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();
CREATE TRIGGER tr_audit_est_servicios AFTER INSERT OR DELETE OR UPDATE ON public.establecimiento_servicios FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();

-- Proteccion logica
CREATE TRIGGER trg_check_borrado_categoria BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_borrado_logico_categoria();
CREATE TRIGGER trg_check_borrado_tipo_habitacion BEFORE UPDATE ON public.tipo_habitaciones FOR EACH ROW EXECUTE FUNCTION public.fn_proteger_borrado_logico_tipo_habitacion();
CREATE TRIGGER tg_validar_categoria_antes_insert BEFORE INSERT OR UPDATE ON public.establecimientos FOR EACH ROW EXECUTE FUNCTION public.fn_validar_categoria_activa();

-- Inmutabilidad auditoria
CREATE TRIGGER trg_inmutabilidad_auditoria BEFORE DELETE OR UPDATE ON public.auditoria_transacciones FOR EACH ROW EXECUTE FUNCTION public.fn_impedir_alteracion_auditoria();

-- RLS en habitaciones
ALTER TABLE public.habitaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY aislar_registros_eliminados ON public.habitaciones FOR SELECT USING (eliminado_at IS NULL);
CREATE POLICY insert_habitaciones ON public.habitaciones FOR INSERT WITH CHECK (true);
CREATE POLICY update_habitaciones ON public.habitaciones FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY delete_habitaciones ON public.habitaciones FOR DELETE USING (true);

-- RLS en personal
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY aislar_personal_eliminado ON public.personal FOR SELECT USING (eliminado_at IS NULL);
CREATE POLICY insert_personal ON public.personal FOR INSERT WITH CHECK (true);
CREATE POLICY update_personal ON public.personal FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY delete_personal ON public.personal FOR DELETE USING (true);

