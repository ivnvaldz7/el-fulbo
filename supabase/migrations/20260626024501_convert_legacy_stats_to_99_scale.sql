-- Convierte los stats legacy (escala 1-10) a la nueva escala 1-99.
-- Esto multiplica por 10 los stats de todas las cartas que tengan todos sus valores <= 10.

-- 1. Jugadores de campo
update public.players
set stats = jsonb_build_object(
  'pac', (stats->>'pac')::int * 10,
  'sho', (stats->>'sho')::int * 10,
  'pas', (stats->>'pas')::int * 10,
  'dri', (stats->>'dri')::int * 10,
  'def', (stats->>'def')::int * 10,
  'phy', (stats->>'phy')::int * 10
)
where primary_position <> 'ARQ'
  and stats ? 'pac' -- Asegura que tenga el formato correcto
  and (stats->>'pac')::int <= 10
  and (stats->>'sho')::int <= 10
  and (stats->>'pas')::int <= 10
  and (stats->>'dri')::int <= 10
  and (stats->>'def')::int <= 10
  and (stats->>'phy')::int <= 10;

-- 2. Arqueros (ARQ)
update public.players
set stats = jsonb_build_object(
  'div', (stats->>'div')::int * 10,
  'han', (stats->>'han')::int * 10,
  'kic', (stats->>'kic')::int * 10,
  'ref', (stats->>'ref')::int * 10,
  'spd', (stats->>'spd')::int * 10,
  'pos', (stats->>'pos')::int * 10
)
where primary_position = 'ARQ'
  and stats ? 'div' -- Asegura que tenga el formato de arquero
  and (stats->>'div')::int <= 10
  and (stats->>'han')::int <= 10
  and (stats->>'kic')::int <= 10
  and (stats->>'ref')::int <= 10
  and (stats->>'spd')::int <= 10
  and (stats->>'pos')::int <= 10;
