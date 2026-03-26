-- ============================================================
-- SISPARDT - BD Sistema
-- 02: Esquema usuarios del sistema (usuarios_sistema, roles, usuarios_roles)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usuarios_sistema (
    id uuid PRIMARY KEY,  -- ID proveniente de Keycloak
    username varchar(100) NOT NULL,
    nombres varchar(150),
    apellidos varchar(150),
    estado varchar(20) NOT NULL DEFAULT 'ACTIVO',
    creado_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_at timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_sistema_username ON public.usuarios_sistema (username);
CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_estado ON public.usuarios_sistema (estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_creado_at ON public.usuarios_sistema (creado_at DESC);

CREATE TABLE IF NOT EXISTS public.roles (
    id serial PRIMARY KEY,
    nombre varchar(50) NOT NULL UNIQUE,
    descripcion varchar(150),
    creado_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_roles_nombre ON public.roles (nombre);

CREATE TABLE IF NOT EXISTS public.usuarios_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL,
    rol_id integer NOT NULL,
    asignado_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eliminado_at timestamp with time zone,
    CONSTRAINT fk_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuarios_sistema (id),
    CONSTRAINT fk_rol FOREIGN KEY (rol_id) REFERENCES public.roles (id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_roles_usuario ON public.usuarios_roles (usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_roles_rol ON public.usuarios_roles (rol_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_roles_activos ON public.usuarios_roles (usuario_id, rol_id) WHERE eliminado_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_rol_activo ON public.usuarios_roles (usuario_id, rol_id) WHERE eliminado_at IS NULL;
