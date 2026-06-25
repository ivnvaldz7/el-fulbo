-- RPC para que un jugador se quite a si mismo de un equipo (soft-delete voluntario).
-- Necesita security definer porque RLS solo permite que el usuario se updatee a
-- si mismo si esta en estado 'pending_approval', no cuando ya esta 'approved'.

create or replace function public.archive_self_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_player public.players%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into target_player
  from public.players
  where id = p_player_id;

  if target_player.id is null then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;

  if target_player.user_id <> auth.uid() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if target_player.archived_at is not null then
    raise exception 'ALREADY_ARCHIVED' using errcode = '23505';
  end if;

  update public.players
  set archived_at = now(),
      is_expelled = false,
      current_boost = null
  where id = p_player_id;

  if not found then
    raise exception 'NOT_FOUND' using errcode = '23503';
  end if;
end;
$$;
