-- Sincroniza las stats y posiciones de TODAS las cartas de cada usuario
-- con su carta mas reciente (incluyendo archivadas).
--
-- Esto cura los casos de usuarios que, al unirse a un nuevo grupo,
-- recibieron stats de una carta vieja en vez de la mas actualizada.
-- A partir del Fix 3 (20260625000000), las cartas nuevas ya se crean
-- con las stats correctas, pero las existentes quedaron desactualizadas.

update public.players p
set
  primary_position = latest.primary_position,
  secondary_position = latest.secondary_position,
  stats = latest.stats
from (
  select distinct on (user_id)
    user_id,
    primary_position,
    secondary_position,
    stats
  from public.players
  where stats_status <> 'rejected'
  order by user_id, joined_at desc
) latest
where p.user_id = latest.user_id
  and (
    p.primary_position is distinct from latest.primary_position
    or p.secondary_position is distinct from latest.secondary_position
    or p.stats is distinct from latest.stats
  );
