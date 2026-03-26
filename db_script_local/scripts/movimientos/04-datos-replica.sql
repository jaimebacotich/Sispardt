-- ============================================
-- SISPARDT - BD Movimientos
-- 04: Datos de Replica Cache (seed inicial)
-- IDs alineados con BD establecimientos
-- ============================================

-- ── Países ────────────────────────────────────────────────────────────────────
INSERT INTO public.paises_replica_cache (id, nombre, codigo_iso, es_sistema) VALUES
(1, 'Bolivia',        'BOL', true),
(2, 'Argentina',      'ARG', false),
(3, 'Brasil',         'BRA', false),
(4, 'Chile',          'CHL', false),
(5, 'Colombia',       'COL', false),
(6, 'Ecuador',        'ECU', false),
(7, 'Paraguay',       'PRY', false),
(8, 'Peru',           'PER', false),
(9, 'Uruguay',        'URY', false),
(10,'Venezuela',      'VEN', false),
(11,'Estados Unidos', 'USA', false),
(12,'España',         'ESP', false),
(13,'Francia',        'FRA', false),
(14,'Alemania',       'DEU', false),
(15,'Reino Unido',    'GBR', false),
(16,'Italia',         'ITA', false),
(17,'Canada',         'CAN', false),
(18,'Mexico',         'MEX', false),
(19,'Japon',          'JPN', false),
(20,'China',          'CHN', false),
(21,'Australia',      'AUS', false),
(22,'Israel',         'ISR', false),
(23,'Paises Bajos',   'NLD', false),
(24,'Suiza',          'CHE', false),
(25,'Suecia',         'SWE', false),
(26,'Corea del Sur',  'KOR', false)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, codigo_iso = EXCLUDED.codigo_iso;

-- ── Departamentos de Bolivia (9) ──────────────────────────────────────────────
-- IDs extraídos de BD establecimientos (divisiones_principales)
INSERT INTO public.divisiones_principales_replica_cache (id, pais_id, nombre, es_sistema) VALUES
(1, 1, 'Cochabamba', true),
(2, 1, 'La Paz',     true),
(3, 1, 'Oruro',      true),
(4, 1, 'Chuquisaca', true),
(5, 1, 'Santa Cruz', true),
(6, 1, 'Tarija',     true),
(7, 1, 'Beni',       true),
(8, 1, 'Pando',      true),
(9, 1, 'Potosí',     true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- ── Provincias de Tarija (6) ───────────────────────────────────────────────────
INSERT INTO public.divisiones_secundarias_replica_cache (id, division_principal_id, nombre, es_sistema) VALUES
(79, 6, 'Cercado',          true),
(80, 6, 'Arce',             true),
(81, 6, 'Gran Chaco',       true),
(82, 6, 'O''Connor',        true),
(83, 6, 'Avilés',           true),
(84, 6, 'Eustaquio Méndez', true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- ── Municipios de Tarija (11) ─────────────────────────────────────────────────
INSERT INTO public.localidades_replica_cache (id, division_secundaria_id, nombre, es_sistema) VALUES
(217, 79, 'Tarija',       true),
(218, 80, 'Bermejo',      true),
(219, 81, 'Yacuiba',      true),
(220, 81, 'Villa Montes', true),
(221, 81, 'Caraparí',     true),
(222, 82, 'Entre Ríos',   true),
(223, 83, 'Uriondo',      true),
(224, 83, 'Padcaya',      true),
(225, 83, 'Yunchará',     true),
(226, 84, 'San Lorenzo',  true),
(227, 84, 'El Puente',    true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- Nota: el resto de departamentos, provincias y municipios es replicado
-- automáticamente por el kafka-consumer al arrancar el sistema.
