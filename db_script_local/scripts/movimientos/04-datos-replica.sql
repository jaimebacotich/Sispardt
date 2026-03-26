-- ============================================
-- SISPARDT - BD Movimientos
-- 04: Datos de Replica Cache (manual, hasta que Debezium sincronice)
-- ============================================

-- Replica de paises (solo los necesarios para procedencia)
INSERT INTO public.paises_replica_cache (id, nombre, codigo_iso, es_sistema) VALUES
(1, 'Bolivia', 'BOL', true);

-- Paises adicionales comunes (para procedencia de huespedes)
INSERT INTO public.paises_replica_cache (id, nombre, codigo_iso) VALUES
(2, 'Argentina', 'ARG'),
(3, 'Brasil', 'BRA'),
(4, 'Chile', 'CHL'),
(5, 'Colombia', 'COL'),
(6, 'Ecuador', 'ECU'),
(7, 'Paraguay', 'PRY'),
(8, 'Peru', 'PER'),
(9, 'Uruguay', 'URY'),
(10, 'Venezuela', 'VEN'),
(11, 'Estados Unidos', 'USA'),
(12, 'Espana', 'ESP'),
(13, 'Francia', 'FRA'),
(14, 'Alemania', 'DEU'),
(15, 'Reino Unido', 'GBR'),
(16, 'Italia', 'ITA'),
(17, 'Canada', 'CAN'),
(18, 'Mexico', 'MEX'),
(19, 'Japon', 'JPN'),
(20, 'China', 'CHN'),
(21, 'Australia', 'AUS'),
(22, 'Israel', 'ISR'),
(23, 'Paises Bajos', 'NLD'),
(24, 'Suiza', 'CHE'),
(25, 'Suecia', 'SWE'),
(26, 'Corea del Sur', 'KOR');


-- Replica de divisiones principales
INSERT INTO public.divisiones_principales_replica_cache (id, pais_id, nombre, es_sistema) VALUES
(1, 1, 'Tarija', true);

-- Replica de divisiones secundarias
INSERT INTO public.divisiones_secundarias_replica_cache (id, division_principal_id, nombre, es_sistema) VALUES
(1, 1, 'Cercado', true),
(2, 1, 'Arce', true),
(3, 1, 'Gran Chaco', true),
(4, 1, 'Aviles', true),
(5, 1, 'Mendez', true),
(6, 1, 'O''Connor', true);

-- Replica de localidades
INSERT INTO public.localidades_replica_cache (id, division_secundaria_id, nombre, es_sistema) VALUES
(1, 1, 'Tarija', true),
(2, 2, 'Padcaya', true),
(3, 2, 'Bermejo', true),
(4, 3, 'Yacuiba', true),
(5, 3, 'Villamontes', true),
(6, 3, 'Carapari', true),
(7, 4, 'Uriondo', true),
(8, 4, 'Yunchar', true),
(9, 5, 'San Lorenzo', true),
(10, 5, 'El Puente', true),
(11, 6, 'Entre Rios', true);
