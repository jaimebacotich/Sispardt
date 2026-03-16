-- ============================================
-- SISPARDT - BD Establecimientos
-- 03: Datos Geográficos (Bolivia - Completo)
-- ============================================
-- Bolivia: 9 Departamentos, todas las Provincias y Municipios
-- ============================================

DO $$
DECLARE
    v_bolivia_id  INTEGER;
    v_dep_id      INTEGER;
    v_prov_id     INTEGER;
BEGIN

-- ══════════════════════════════════════════════════
-- 1. PAÍS: Bolivia
-- ══════════════════════════════════════════════════
INSERT INTO public.paises (nombre, codigo_iso, es_sistema)
VALUES ('Bolivia', 'BOL', true)
ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre, es_sistema = EXCLUDED.es_sistema;

SELECT id INTO v_bolivia_id FROM public.paises WHERE codigo_iso = 'BOL';

-- ══════════════════════════════════════════════════
-- 2. DEPARTAMENTOS (9)
-- ══════════════════════════════════════════════════
INSERT INTO public.divisiones_principales (pais_id, nombre, es_sistema)
SELECT v_bolivia_id, d, true
FROM unnest(ARRAY[
    'Chuquisaca','La Paz','Cochabamba','Oruro',
    'Potosí','Tarija','Santa Cruz','Beni','Pando'
]) AS d
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_principales
    WHERE pais_id = v_bolivia_id AND nombre = d
);

-- ══════════════════════════════════════════════════════════════════════════
-- 3. PROVINCIAS Y MUNICIPIOS POR DEPARTAMENTO
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- CHUQUISACA (10 provincias)
-- ─────────────────────────────────────────────────────────────────────────
SELECT id INTO v_dep_id FROM public.divisiones_principales WHERE pais_id = v_bolivia_id AND nombre = 'Chuquisaca';

INSERT INTO public.divisiones_secundarias (division_principal_id, nombre, es_sistema)
SELECT v_dep_id, p, true
FROM unnest(ARRAY[
    'Oropeza','Yamparáez','Nor Cinti','Sud Cinti','Belisario Boeto',
    'Hernando Siles','Tomina','Azurduy','Zudáñez','Luis Calvo'
]) AS p
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = p
);

-- Oropeza
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Oropeza';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Sucre','Poroma']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Yamparáez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Yamparáez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Yamparáez','Tarabuco']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Nor Cinti
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Nor Cinti';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Camblaya','Culpina','Las Carreras']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Sud Cinti
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Sud Cinti';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Villa Abecia','Incahuasi','San Lucas']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Belisario Boeto
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Belisario Boeto';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Villa Serrano']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Hernando Siles
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Hernando Siles';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Monteagudo','Huacareta']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Tomina
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Tomina';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Padilla','Tomina','Sopachuy','El Villar','Alcalá']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Azurduy
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Azurduy';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Azurduy','Tarvita']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Zudáñez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Zudáñez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Zudáñez','Presto','Mojocoya','Icla']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Luis Calvo
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Luis Calvo';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Muyupampa','Huacaya','Macharetí']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);


-- ─────────────────────────────────────────────────────────────────────────
-- LA PAZ (20 provincias)
-- ─────────────────────────────────────────────────────────────────────────
SELECT id INTO v_dep_id FROM public.divisiones_principales WHERE pais_id = v_bolivia_id AND nombre = 'La Paz';

INSERT INTO public.divisiones_secundarias (division_principal_id, nombre, es_sistema)
SELECT v_dep_id, p, true
FROM unnest(ARRAY[
    'Murillo','Omasuyos','Pacajes','Camacho','Muñecas',
    'Larecaja','Franz Tamayo','Ingavi','Loayza','Inquisivi',
    'Sud Yungas','Nor Yungas','Abel Iturralde','Bautista Saavedra',
    'Manco Kapac','Aroma','Caranavi','Gualberto Villarroel',
    'José Manuel Pando','Sud Caranavi'
]) AS p
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = p
);

-- Murillo
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Murillo';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['La Paz','El Alto','Palca','Mecapaca','Achocalla']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Omasuyos
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Omasuyos';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Achacachi','Ancoraimes']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Pacajes
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Pacajes';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY[
    'Coro Coro','Caquiaviri','Calacoto','Comanche',
    'Charaña','Waldo Ballivián','Nazacara de Pacajes','Santiago de Callapa'
]) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Camacho
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Camacho';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Puerto Acosta','Mocomoco','San Pedro de Tiquina','Puerto Carabuco']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Muñecas
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Muñecas';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Chuma','Ayata','Aucapata']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Larecaja
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Larecaja';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY[
    'Sorata','Guanay','Tacacoma','Quiabaya','Combaya',
    'San Juan','Teoponte','Mapiri','Tipuani'
]) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Franz Tamayo
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Franz Tamayo';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Apolo','Pelechuco','Curva']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Ingavi
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Ingavi';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY[
    'Viacha','Guaqui','Tiwanaku','Desaguadero',
    'San Andrés de Machaca','Jesús de Machaca'
]) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Loayza
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Loayza';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Luribay','Sapahaqui','Yaco','Malla','Cairoma']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Inquisivi
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Inquisivi';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Inquisivi','Quime','Cajuata','Colquiri','Ichoca','Licoma']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Sud Yungas
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Sud Yungas';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Chulumani','Irupana','Yanacachi','Palos Blancos','La Asunta']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Nor Yungas
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Nor Yungas';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Coroico','Coripata']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Abel Iturralde
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Abel Iturralde';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Ixiamas','San Buenaventura']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Bautista Saavedra
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Bautista Saavedra';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Charazani','Curva']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Manco Kapac
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Manco Kapac';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Copacabana']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Aroma
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Aroma';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY[
    'Sica Sica','Ayo Ayo','Patacamaya','Colquencha','Calamarca','Umala'
]) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Caranavi
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Caranavi';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Caranavi']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Gualberto Villarroel
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Gualberto Villarroel';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Pedro de Curahuara','Papel Pampa','Chacarilla']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- José Manuel Pando
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'José Manuel Pando';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['El Choro','Colonia Germán Busch']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Sud Caranavi
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Sud Caranavi';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Alto Beni']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);


-- ─────────────────────────────────────────────────────────────────────────
-- COCHABAMBA (16 provincias)
-- ─────────────────────────────────────────────────────────────────────────
SELECT id INTO v_dep_id FROM public.divisiones_principales WHERE pais_id = v_bolivia_id AND nombre = 'Cochabamba';

INSERT INTO public.divisiones_secundarias (division_principal_id, nombre, es_sistema)
SELECT v_dep_id, p, true
FROM unnest(ARRAY[
    'Cercado','Ayopaya','Esteban Arce','Arani','Arque',
    'Capinota','Germán Jordán','Quillacollo','Chapare','Tapacarí',
    'Tiraque','Punata','Bolívar','Mizque','Campero','Carrasco'
]) AS p
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = p
);

-- Cercado
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Cercado';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Cochabamba']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Ayopaya
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Ayopaya';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Independencia','Cocapata','Morochata']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Esteban Arce
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Esteban Arce';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Tarata','Arbieto','Tolata']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Arani
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Arani';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Arani','Vacas']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Arque
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Arque';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Arque','Tacopaya']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Capinota
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Capinota';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Capinota','Santivañez','Sicaya']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Germán Jordán
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Germán Jordán';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Cliza','Toco']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Quillacollo
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Quillacollo';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Quillacollo','Sipe Sipe','Colcapirhua','Tiquipaya','Vinto']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Chapare
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Chapare';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Sacaba','Colomi','Villa Tunari','Sinahota']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Tapacarí
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Tapacarí';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Tapacarí']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Tiraque
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Tiraque';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Tiraque']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Punata
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Punata';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Punata','Villa Rivero','San Benito']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Bolívar
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Bolívar';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Bolívar']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Mizque
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Mizque';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Mizque','Alalay','Vila Vila']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Campero
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Campero';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Aiquile','Pasorapa','Omereque']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Carrasco
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Carrasco';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Totora','Pojo','Chimoré','Puerto Villarroel','Entre Ríos']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);


-- ─────────────────────────────────────────────────────────────────────────
-- ORURO (16 provincias)
-- ─────────────────────────────────────────────────────────────────────────
SELECT id INTO v_dep_id FROM public.divisiones_principales WHERE pais_id = v_bolivia_id AND nombre = 'Oruro';

INSERT INTO public.divisiones_secundarias (division_principal_id, nombre, es_sistema)
SELECT v_dep_id, p, true
FROM unnest(ARRAY[
    'Cercado','Sajama','Litoral','Sabaya','Carangas',
    'San Pedro de Totora','Nor Carangas','Saucarí','Tomás Barrón','Sur Carangas',
    'Pantaleón Dalence','Poopó','Paria','Eduardo Avaroa','Ladislao Cabrera','Mejillones'
]) AS p
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = p
);

-- Cercado
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Cercado';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Oruro']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Sajama
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Sajama';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Curahuara de Carangas','Turco','Cosapa']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Litoral
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Litoral';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Huachacalla','Cruz de Machacamarca','Yunguyo de Litoral','Escara']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Sabaya
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Sabaya';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Sabaya','Coipasa','Salinas de Garci Mendoza']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Carangas
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Carangas';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Corque']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- San Pedro de Totora
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'San Pedro de Totora';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Pedro de Totora']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Nor Carangas
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Nor Carangas';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Santiago de Andamarca','Choque Cota']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Saucarí
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Saucarí';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Toledo']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Tomás Barrón
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Tomás Barrón';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Eucaliptus']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Sur Carangas
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Sur Carangas';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Huayllamarca','Belén de Andamarca']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Pantaleón Dalence
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Pantaleón Dalence';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Huanuni','Machacamarca']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Poopó
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Poopó';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Poopó','Pazña','Antequera']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Paria
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Paria';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['El Choro','Caracollo']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Eduardo Avaroa
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Eduardo Avaroa';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Challapata','Santuario de Quillacas','Santiago de Huari']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Ladislao Cabrera
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Ladislao Cabrera';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Salinas de Pampa Aullagas','Pampa Aullagas','Orinoca']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Mejillones
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Mejillones';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Todos Santos','Santiago de Huayllamarca']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);


-- ─────────────────────────────────────────────────────────────────────────
-- POTOSÍ (16 provincias)
-- ─────────────────────────────────────────────────────────────────────────
SELECT id INTO v_dep_id FROM public.divisiones_principales WHERE pais_id = v_bolivia_id AND nombre = 'Potosí';

INSERT INTO public.divisiones_secundarias (division_principal_id, nombre, es_sistema)
SELECT v_dep_id, p, true
FROM unnest(ARRAY[
    'Tomás Frías','Rafael Bustillo','Cornelio Saavedra','Chayanta','Charcas',
    'Nor Chichas','Alonso de Ibáñez','Sud Chichas','Modesto Omiste','Bilbao',
    'José María Linares','Antonio Quijarro','Daniel Campos',
    'Nor Lípez','Sud Lípez','Enrique Aldana'
]) AS p
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = p
);

-- Tomás Frías
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Tomás Frías';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Potosí']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Rafael Bustillo
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Rafael Bustillo';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Uncía','Llallagua','Chayanta']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Cornelio Saavedra
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Cornelio Saavedra';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Betanzos','Tacobamba','Chaquí']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Chayanta
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Chayanta';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Macha','Pocoata','Colquechaca','Ravelo','Ocurí']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Charcas
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Charcas';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Pedro de Buena Vista']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Nor Chichas
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Nor Chichas';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Cotagaita','Vitichi']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Alonso de Ibáñez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Alonso de Ibáñez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Sacaca','Caripuyo']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Sud Chichas
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Sud Chichas';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Tupiza','Atocha']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Modesto Omiste
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Modesto Omiste';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Villazón']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Bilbao
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Bilbao';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Arampampa','Acasio']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- José María Linares
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'José María Linares';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Puna','Caiza D','Canutillos']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Antonio Quijarro
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Antonio Quijarro';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Uyuni','Tomave','Porco']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Daniel Campos
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Daniel Campos';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Llica','Tahua']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Nor Lípez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Nor Lípez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Colcha K','San Pedro de Quemes']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Sud Lípez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Sud Lípez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Pablo de Lípez','Mojinete','San Antonio de Esmoruco']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Enrique Aldana
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Enrique Aldana';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Agustín','San Antonio de Esmoruco']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);


-- ─────────────────────────────────────────────────────────────────────────
-- TARIJA (6 provincias)
-- ─────────────────────────────────────────────────────────────────────────
SELECT id INTO v_dep_id FROM public.divisiones_principales WHERE pais_id = v_bolivia_id AND nombre = 'Tarija';

INSERT INTO public.divisiones_secundarias (division_principal_id, nombre, es_sistema)
SELECT v_dep_id, p, true
FROM unnest(ARRAY[
    'Cercado','Arce','Gran Chaco','O''Connor','Avilés','Eustaquio Méndez'
]) AS p
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = p
);

-- Cercado
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Cercado';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Tarija']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Arce
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Arce';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Bermejo']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Gran Chaco
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Gran Chaco';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Yacuiba','Villa Montes','Caraparí']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- O'Connor
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'O''Connor';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Entre Ríos']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Avilés
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Avilés';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Uriondo','Padcaya','Yunchará']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Eustaquio Méndez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Eustaquio Méndez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Lorenzo','El Puente']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);


-- ─────────────────────────────────────────────────────────────────────────
-- SANTA CRUZ (15 provincias)
-- ─────────────────────────────────────────────────────────────────────────
SELECT id INTO v_dep_id FROM public.divisiones_principales WHERE pais_id = v_bolivia_id AND nombre = 'Santa Cruz';

INSERT INTO public.divisiones_secundarias (division_principal_id, nombre, es_sistema)
SELECT v_dep_id, p, true
FROM unnest(ARRAY[
    'Andrés Ibáñez','Ichilo','Sara','Obispo Santistevan','Ñuflo de Chávez',
    'Velasco','Chiquitos','Germán Busch','Cordillera','Florida',
    'Warnes','Vallegrande','Caballero','Guarayos','Ángel Sandoval'
]) AS p
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = p
);

-- Andrés Ibáñez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Andrés Ibáñez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY[
    'Santa Cruz de la Sierra','Cotoca','La Guardia','El Torno','Porongo'
]) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Ichilo
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Ichilo';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Buena Vista','San Carlos','Yapacaní','San Juan','Puerto Yapacaní']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Sara
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Sara';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Portachuelo','Santa Rosa del Sara','Colpa Bélgica','Saavedra']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Obispo Santistevan
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Obispo Santistevan';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Montero','Mineros','Fernández Alonso']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Ñuflo de Chávez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Ñuflo de Chávez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY[
    'Concepción','San Javier','San Julián','San Antonio de Lomerío','Cuatro Cañadas','Pailón'
]) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Velasco
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Velasco';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Ignacio de Velasco','San Miguel de Velasco','San Rafael de Velasco']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Chiquitos
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Chiquitos';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San José de Chiquitos','Roboré','San Antonio de la Parada','San Juan de Chiquitos']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Germán Busch
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Germán Busch';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Puerto Suárez','Puerto Quijarro','Carmen Rivero Torres']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Cordillera
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Cordillera';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Camiri','Charagua','Cabezas','Boyuibe','Cuevo','Gutiérrez','Lagunillas']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Florida
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Florida';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Samaipata','Pampagrande','Mairana','Quirusillas']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Warnes
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Warnes';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Warnes','Okinawa Uno']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Vallegrande
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Vallegrande';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Vallegrande','Postrer Valle','Trigal','Moro Moro','Postrervalle']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Caballero
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Caballero';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Comarapa','Saipina','San Marcos de Rojas','El Puente']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Guarayos
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Guarayos';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Ascensión de Guarayos','Urubichá','Guarayos']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Ángel Sandoval
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Ángel Sandoval';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Matías']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);


-- ─────────────────────────────────────────────────────────────────────────
-- BENI (8 provincias)
-- ─────────────────────────────────────────────────────────────────────────
SELECT id INTO v_dep_id FROM public.divisiones_principales WHERE pais_id = v_bolivia_id AND nombre = 'Beni';

INSERT INTO public.divisiones_secundarias (division_principal_id, nombre, es_sistema)
SELECT v_dep_id, p, true
FROM unnest(ARRAY[
    'Cercado','Vaca Díez','Ballivián','Moxos','Mamoré',
    'Iténez','Yacuma','Marbán'
]) AS p
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = p
);

-- Cercado
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Cercado';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Trinidad']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Vaca Díez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Vaca Díez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Riberalta','Guayaramerín']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Ballivián
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Ballivián';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Borja','Reyes','Santa Rosa','Rurrenabaque']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Moxos
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Moxos';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Ignacio de Moxos','Loreto']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Mamoré
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Mamoré';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Joaquín','San Ramón','Puerto Siles']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Iténez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Iténez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Magdalena','Baures','Huacaraje']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Yacuma
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Yacuma';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Santa Ana del Yacuma','Exaltación']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Marbán
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Marbán';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['San Andrés']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);


-- ─────────────────────────────────────────────────────────────────────────
-- PANDO (5 provincias)
-- ─────────────────────────────────────────────────────────────────────────
SELECT id INTO v_dep_id FROM public.divisiones_principales WHERE pais_id = v_bolivia_id AND nombre = 'Pando';

INSERT INTO public.divisiones_secundarias (division_principal_id, nombre, es_sistema)
SELECT v_dep_id, p, true
FROM unnest(ARRAY[
    'Nicolás Suárez','Manuripi','Madre de Dios','Abuná','Federico Román'
]) AS p
WHERE NOT EXISTS (
    SELECT 1 FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = p
);

-- Nicolás Suárez
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Nicolás Suárez';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Cobija','Filadelfia','Bella Flor','Puerto Rico','San Lorenzo','Bolpebra']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Manuripi
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Manuripi';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Puerto Rico','Montevideo','San Pedro','Nueva Esperanza','Santos Mercado']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Madre de Dios
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Madre de Dios';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Puerto Gonzalo Moreno','San Lorenzo','Sena','Luz de América']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Abuná
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Abuná';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Ingavi']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);

-- Federico Román
SELECT id INTO v_prov_id FROM public.divisiones_secundarias WHERE division_principal_id = v_dep_id AND nombre = 'Federico Román';
INSERT INTO public.localidades (division_secundaria_id, nombre, es_sistema)
SELECT v_prov_id, m, true FROM unnest(ARRAY['Nacebe','Villa Nueva']) AS m
WHERE NOT EXISTS (SELECT 1 FROM public.localidades WHERE division_secundaria_id = v_prov_id AND nombre = m);


-- ══════════════════════════════════════════════════
-- 4. PAÍSES LIMÍTROFES Y RELEVANTES
-- ══════════════════════════════════════════════════
INSERT INTO public.paises (nombre, codigo_iso) VALUES ('Argentina', 'ARG') ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.paises (nombre, codigo_iso) VALUES ('Brasil', 'BRA') ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.paises (nombre, codigo_iso) VALUES ('Chile', 'CHL') ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.paises (nombre, codigo_iso) VALUES ('Colombia', 'COL') ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.paises (nombre, codigo_iso) VALUES ('Ecuador', 'ECU') ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.paises (nombre, codigo_iso) VALUES ('Paraguay', 'PRY') ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.paises (nombre, codigo_iso) VALUES ('Perú', 'PER') ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.paises (nombre, codigo_iso) VALUES ('Uruguay', 'URY') ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.paises (nombre, codigo_iso) VALUES ('Venezuela', 'VEN') ON CONFLICT (codigo_iso) DO UPDATE SET nombre = EXCLUDED.nombre;

END $$;
