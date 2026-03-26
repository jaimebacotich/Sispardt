-- ============================================
-- SISPARDT - BD Establecimientos
-- 04: Datos de Catalogos (Simplificado)
-- ============================================

DO $$
BEGIN
    -- 1. CLASIFICACIONES
    INSERT INTO public.clasificaciones (nombre) VALUES ('Hotel') ON CONFLICT (nombre) DO NOTHING;
    INSERT INTO public.clasificaciones (nombre) VALUES ('Hostal') ON CONFLICT (nombre) DO NOTHING;
    INSERT INTO public.clasificaciones (nombre) VALUES ('Alojamiento') ON CONFLICT (nombre) DO NOTHING;

    -- 2. CATEGORÍAS (Relacionadas con Clasificaciones)
    -- Hotel: 1 a 5 estrellas
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, '1 Estrella' FROM public.clasificaciones WHERE nombre = 'Hotel'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = '1 Estrella' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Hotel'));
    
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, '2 Estrellas' FROM public.clasificaciones WHERE nombre = 'Hotel'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = '2 Estrellas' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Hotel'));
    
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, '3 Estrellas' FROM public.clasificaciones WHERE nombre = 'Hotel'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = '3 Estrellas' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Hotel'));
    
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, '4 Estrellas' FROM public.clasificaciones WHERE nombre = 'Hotel'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = '4 Estrellas' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Hotel'));
    
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, '5 Estrellas' FROM public.clasificaciones WHERE nombre = 'Hotel'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = '5 Estrellas' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Hotel'));

    -- Hostal: 1 a 3 estrellas
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, '1 Estrella' FROM public.clasificaciones WHERE nombre = 'Hostal'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = '1 Estrella' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Hostal'));
    
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, '2 Estrellas' FROM public.clasificaciones WHERE nombre = 'Hostal'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = '2 Estrellas' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Hostal'));
    
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, '3 Estrellas' FROM public.clasificaciones WHERE nombre = 'Hostal'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = '3 Estrellas' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Hostal'));

    -- Alojamiento: Tipo A y Tipo B
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, 'Tipo A' FROM public.clasificaciones WHERE nombre = 'Alojamiento'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = 'Tipo A' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Alojamiento'));
    
    INSERT INTO public.categorias (clasificacion_id, nombre)
    SELECT id, 'Tipo B' FROM public.clasificaciones WHERE nombre = 'Alojamiento'
    AND NOT EXISTS (SELECT 1 FROM public.categorias WHERE nombre = 'Tipo B' AND clasificacion_id = (SELECT id FROM public.clasificaciones WHERE nombre = 'Alojamiento'));

    -- 3. TIPOS DE HABITACION
    INSERT INTO public.tipo_habitaciones (nombre) VALUES ('Individual') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_habitaciones (nombre) VALUES ('Doble') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_habitaciones (nombre) VALUES ('Triple') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_habitaciones (nombre) VALUES ('Matrimonial') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_habitaciones (nombre) VALUES ('Familiar') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_habitaciones (nombre) VALUES ('Suite') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_habitaciones (nombre) VALUES ('Suite Presidencial') ON CONFLICT DO NOTHING;

    -- 4. TIPOS DE CAMA
    INSERT INTO public.tipo_camas (nombre, capacidad_personas) VALUES ('Individual', 1) ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_camas (nombre, capacidad_personas) VALUES ('Litera', 2) ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_camas (nombre, capacidad_personas) VALUES ('Matrimonial', 2) ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_camas (nombre, capacidad_personas) VALUES ('Queen', 2) ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_camas (nombre, capacidad_personas) VALUES ('King', 2) ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_camas (nombre, capacidad_personas) VALUES ('Cuna', 1) ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_camas (nombre, capacidad_personas) VALUES ('Sofá Cama', 1) ON CONFLICT DO NOTHING;

    -- 5. SERVICIOS
    INSERT INTO public.servicios (nombre) VALUES ('WiFi') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Estacionamiento') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Restaurante') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Piscina') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Gimnasio') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Lavandería') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Room Service') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Aire Acondicionado') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Calefacción') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('TV Cable') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Desayuno Incluido') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Bar') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Salón de Eventos') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Transporte Aeropuerto') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Spa') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Caja Fuerte') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Recepción 24h') ON CONFLICT DO NOTHING;
    INSERT INTO public.servicios (nombre) VALUES ('Ascensor') ON CONFLICT DO NOTHING;

    -- 6. TIPOS DE PERSONAL
    INSERT INTO public.tipo_personal (nombre) VALUES ('Administrador') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_personal (nombre) VALUES ('Recepcionista') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_personal (nombre) VALUES ('Conserje') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_personal (nombre) VALUES ('Mucama') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_personal (nombre) VALUES ('Seguridad') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_personal (nombre) VALUES ('Mantenimiento') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_personal (nombre) VALUES ('Cocinero') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_personal (nombre) VALUES ('Botones') ON CONFLICT DO NOTHING;
    INSERT INTO public.tipo_personal (nombre) VALUES ('Otro') ON CONFLICT DO NOTHING;

END $$;
