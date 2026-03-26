-- ============================================================
-- SISPARDT - BD Sistema
-- 05: Auditoría transaccional de tablas de usuarios
-- Tabla simple sin particionamiento (uso institucional limitado)
-- ============================================================

-- Función: captura cambios en cualquier tabla auditada
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

    v_ip_origen  := NULLIF(current_setting('app.client_ip',          true), '')::INET;
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

-- Función: impide modificar registros de auditoría (inmutabilidad)
CREATE OR REPLACE FUNCTION public.fn_impedir_alteracion_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'Violacion de Integridad: Los registros de auditoria son inmutables.';
    RETURN NULL;
END;
$$;

-- Tabla de auditoría (sin particionamiento)
CREATE TABLE IF NOT EXISTS public.auditoria_transacciones (
    id                bigserial    PRIMARY KEY,
    tabla_afectada    varchar(50)  NOT NULL,
    accion            varchar(20)  NOT NULL,
    valor_anterior    jsonb,
    valor_nuevo       jsonb,
    keycloak_usuario_id uuid       NOT NULL,
    ip_origen         inet,
    creado_at         timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    registro_id       varchar(255),
    usuario_username  varchar(150),
    usuario_nombre    varchar(150),
    usuario_apellido  varchar(150)
);

-- Índices de consulta frecuente
CREATE INDEX IF NOT EXISTS idx_audit_tabla_fecha  ON public.auditoria_transacciones (tabla_afectada, creado_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_usuario       ON public.auditoria_transacciones (keycloak_usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_registro_id  ON public.auditoria_transacciones (registro_id);

-- Trigger de inmutabilidad sobre la tabla de auditoría
CREATE TRIGGER trg_inmutabilidad_auditoria
    BEFORE UPDATE OR DELETE ON public.auditoria_transacciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_impedir_alteracion_auditoria();

-- Triggers de auditoría sobre las tablas de usuarios del sistema
CREATE OR REPLACE TRIGGER trg_audit_usuarios_sistema
    AFTER INSERT OR UPDATE OR DELETE ON public.usuarios_sistema
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();

CREATE OR REPLACE TRIGGER trg_audit_roles
    AFTER INSERT OR UPDATE OR DELETE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();

CREATE OR REPLACE TRIGGER trg_audit_usuarios_roles
    AFTER INSERT OR UPDATE OR DELETE ON public.usuarios_roles
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambios();

-- Permisos para el rol de aplicación
GRANT SELECT, INSERT ON TABLE public.auditoria_transacciones TO rol_sistema;
GRANT USAGE, SELECT ON SEQUENCE public.auditoria_transacciones_id_seq TO rol_sistema;
