-- ============================================================
-- SISPARDT — Seed de roles del sistema
-- ============================================================

INSERT INTO public.roles (nombre, descripcion) VALUES
    ('rol_admin_general',           'Administrador general'),
    ('rol_recepcionista',           'Recepcionista'),
    ('rol_responsable_registro',    'Responsable de registro'),
    ('rol_responsable_estadistica', 'Responsable de estadística'),
    ('rol_estadistica_externa',     'Estadística externa'),
    ('rol_tecnico_registro',        'Técnico de registro'),
    ('rol_migraciones',             'Personal de la Dirección de Migración (solo consulta de reportes)')
ON CONFLICT (nombre) DO NOTHING;
