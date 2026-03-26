-- ============================================
-- SISPARDT - BD Movimientos
-- 03: Datos de Catalogos
-- ============================================

-- ============================================
-- TIPOS DE DOCUMENTO
-- ============================================
INSERT INTO public.tipos_documento (sigla, descripcion) VALUES
('CI', 'Cedula de Identidad'),
('PAS', 'Pasaporte'),
('DNI', 'Documento Nacional de Identidad'),
('RUN', 'Registro Unico Nacional'),
('CE', 'Carnet de Extranjeria'),
('OTR', 'Otro');

-- ============================================
-- MOTIVOS DE VIAJE
-- ============================================
INSERT INTO public.motivos_viaje (nombre) VALUES
('Turismo'),
('Negocios'),
('Trabajo'),
('Salud'),
('Educacion'),
('Familiar'),
('Deportes'),
('Religion'),
('Transito'),
('Otro');
