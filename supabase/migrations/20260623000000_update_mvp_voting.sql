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

  if now() > target_event.played_at + interval '24 hours' then
    raise exception 'El período de votación ha finalizado (24hs).';
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

create or replace function public.close_mvp_voting(
  p_event_id uuid,
  p_tiebreaker_player_id uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  top_votes integer;
  tied_count integer;
  winner_id uuid;
begin
  select * into target_event from public.events where id = p_event_id;

  if not public.is_group_admin_or_owner(target_event.group_id) then
    raise exception 'FORBIDDEN';
  end if;

  if target_event.status <> 'played' then
    raise exception 'El partido no está finalizado.';
  end if;

  if target_event.mvp_player_id is not null then
    raise exception 'La votación ya cerró, el MVP ya fue elegido.';
  end if;

  -- Verify votes
  if not exists (select 1 from public.event_mvp_votes where event_id = p_event_id) then
    if p_tiebreaker_player_id is null then
      raise exception 'EMPATE';
    else
      winner_id := p_tiebreaker_player_id;
    end if;
  else
    -- Find max votes
    select count(*) into top_votes
    from public.event_mvp_votes
    where event_id = p_event_id
    group by voted_player_id
    order by count(*) desc
    limit 1;

    -- Check how many have the top votes
    select count(*) into tied_count
    from (
      select voted_player_id
      from public.event_mvp_votes
      where event_id = p_event_id
      group by voted_player_id
      having count(*) = top_votes
    ) sub;

    if tied_count > 1 then
      if p_tiebreaker_player_id is null then
        raise exception 'EMPATE';
      end if;
      winner_id := p_tiebreaker_player_id;
    else
      -- Clear winner
      select voted_player_id into winner_id
      from public.event_mvp_votes
      where event_id = p_event_id
      group by voted_player_id
      order by count(*) desc
      limit 1;
    end if;
  end if;

  if winner_id is not null then
    -- Verify tiebreaker/winner played the match
    if not exists (
      select 1 from public.match_participations 
      where event_id = p_event_id and player_id = winner_id and team in ('A', 'B')
    ) then
      raise exception 'El jugador elegido no jugó el partido.';
    end if;
  end if;

  update public.events set mvp_player_id = winner_id where id = p_event_id;

  if winner_id is not null then
    insert into public.notifications (user_id, type, payload)
    select user_id, 'mvp_awarded', jsonb_build_object('event_id', p_event_id, 'player_id', winner_id)
    from public.players where id = winner_id and user_id is not null;
  end if;
end;
$$;
