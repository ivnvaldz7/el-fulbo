-- Fix delete_phantom_player RPC: limpia match_participations antes de borrar
-- La FK match_participations.player_id → players(id) tiene ON DELETE RESTRICT,
-- por lo que un phantom con partidos jugados no se puede eliminar directamente.
-- Esta versión borra primero las participaciones y luego el player.

create or replace function public.delete_phantom_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select group_id into v_group_id from public.players
  where id = p_player_id and is_phantom = true;

  if v_group_id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not (is_group_admin(v_group_id) or is_group_owner(v_group_id)) then
    raise exception 'FORBIDDEN';
  end if;

  -- Limpiar participaciones primero (FK restrict en match_participations.player_id)
  delete from public.match_participations
  where player_id = p_player_id;

  delete from public.players where id = p_player_id;
end;
$$;
