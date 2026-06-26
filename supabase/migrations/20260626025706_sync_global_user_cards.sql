-- Convierte las cartas de los jugadores en "documentos globales de identidad".
-- A través de este trigger, si un usuario (o un admin) modifica la posición o los stats
-- en uno de los grupos, el cambio se refleja automáticamente en TODOS los demás grupos 
-- donde el usuario participe activamente (y no sea phantom).
-- Se preservan los stats_status (si estaba aprobado en un grupo, sigue aprobado).

create or replace function public.sync_user_player_cards()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Solo actuar si es un usuario real (no phantom)
  if NEW.user_id is not null and NEW.is_phantom = false then
    
    -- Solo actuar si cambió algo relevante a la "identidad global"
    if NEW.stats is distinct from OLD.stats 
       or NEW.primary_position is distinct from OLD.primary_position 
       or NEW.secondary_position is distinct from OLD.secondary_position
       or NEW.photo_url is distinct from OLD.photo_url
       or NEW.display_name is distinct from OLD.display_name then
       
       update public.players
       set
         stats = NEW.stats,
         primary_position = NEW.primary_position,
         secondary_position = NEW.secondary_position,
         photo_url = NEW.photo_url,
         display_name = NEW.display_name
       where user_id = NEW.user_id
         and id <> NEW.id
         and archived_at is null -- Opcional, pero tiene sentido solo actualizar activas
         -- Esta condición evita el loop infinito del trigger
         and (
           stats is distinct from NEW.stats
           or primary_position is distinct from NEW.primary_position
           or secondary_position is distinct from NEW.secondary_position
           or photo_url is distinct from NEW.photo_url
           or display_name is distinct from NEW.display_name
         );
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_user_player_cards on public.players;
create trigger trg_sync_user_player_cards
after update on public.players
for each row
execute function public.sync_user_player_cards();
