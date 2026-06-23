create or replace function public.submit_mvp_vote(
  p_event_id uuid,
  p_voted_player_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  voter_id uuid;
begin
  select * into target_event from public.events where id = p_event_id;
  
  if target_event.status <> 'played' then
    raise exception 'El partido debe estar finalizado para votar.';
  end if;
  
  if target_event.mvp_player_id is not null then
    raise exception 'La votación ya cerró, el MVP ya fue elegido.';
  end if;

  if target_event.played_at is not null and now() > target_event.played_at + interval '24 hours' then
    raise exception 'El tiempo para votar (24 horas) ya expiró.';
  end if;

  select id into voter_id from public.players where user_id = auth.uid() and group_id = target_event.group_id;

  if voter_id is null then
    raise exception 'No sos parte de este equipo.';
  end if;

  if not exists (
    select 1 from public.match_participations where event_id = p_event_id and player_id = voter_id
  ) then
    raise exception 'No podés votar si no jugaste el partido.';
  end if;

  insert into public.event_mvp_votes (event_id, voter_player_id, voted_player_id)
  values (p_event_id, voter_id, p_voted_player_id);
end;
$$;
