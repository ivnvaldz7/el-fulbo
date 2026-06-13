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
  total_attendees integer;
  total_votes integer;
  winner_id uuid;
begin
  select * into target_event from public.events where id = p_event_id;
  
  if target_event.status <> 'played' then
    raise exception 'El partido debe estar finalizado para votar.';
  end if;
  
  if target_event.mvp_player_id is not null then
    raise exception 'La votación ya cerró, el MVP ya fue elegido.';
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

  -- Check if we crossed the 70% threshold
  select count(*) into total_attendees from public.match_participations where event_id = p_event_id;
  select count(*) into total_votes from public.event_mvp_votes where event_id = p_event_id;

  if total_votes >= (total_attendees * 0.7) then
    -- Find winner
    select voted_player_id into winner_id
    from public.event_mvp_votes
    where event_id = p_event_id
    group by voted_player_id
    order by count(*) desc, max(created_at) asc
    limit 1;

    -- Update event MVP
    update public.events set mvp_player_id = winner_id where id = p_event_id;

    -- Update the MVP's boost (simple upgrade)
    -- This is simplified for V1 MVP voting: we just notify them.
    -- To do the full stats upgrade, we would call a helper, but since we already applied normal victory boost,
    -- we can just notify them that they are MVP.
    insert into public.notifications (user_id, type, payload)
    select user_id, 'mvp_awarded', jsonb_build_object('event_id', p_event_id, 'player_id', winner_id)
    from public.players where id = winner_id and user_id is not null;
  end if;
end;
$$;
