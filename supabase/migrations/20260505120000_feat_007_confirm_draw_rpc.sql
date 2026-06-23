create or replace function public.confirm_draw(
  p_event_id uuid,
  p_seed text,
  p_assignments jsonb,
  p_team_a_name text,
  p_team_b_name text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.events%rowtype;
  assignment_count integer;
  checked_count integer;
  notification_row record;
begin
  select *
  into target_event
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if not public.is_group_admin_or_owner(target_event.group_id) then
    raise exception 'FORBIDDEN';
  end if;

  if target_event.status not in ('confirming', 'checked_in') then
    raise exception 'CONFLICT';
  end if;

  if p_seed is null or char_length(trim(p_seed)) = 0 then
    raise exception 'VALIDATION_ERROR';
  end if;

  if jsonb_typeof(p_assignments) <> 'array' then
    raise exception 'VALIDATION_ERROR';
  end if;

  select count(*) into assignment_count
  from jsonb_array_elements(p_assignments);

  select count(*) into checked_count
  from public.event_attendances
  where event_id = p_event_id
    and checked_in = true;

  if assignment_count <> checked_count then
    raise exception 'CONFLICT';
  end if;

  if exists (
    select 1
    from (
      select value->>'playerId' as player_id, count(*) as total
      from jsonb_array_elements(p_assignments)
      group by value->>'playerId'
    ) duplicated
    where duplicated.total > 1
  ) then
    raise exception 'CONFLICT';
  end if;

  delete from public.match_participations
  where event_id = p_event_id;

  insert into public.match_participations (
    event_id,
    player_id,
    team,
    assigned_position,
    played_primary_position,
    boost_applied
  )
  select
    p_event_id,
    (item.value->>'playerId')::uuid,
    (item.value->>'team')::public.participation_team,
    case
      when item.value->>'team' = 'substitute' then null
      else (item.value->>'assignedPosition')::public.player_position
    end,
    coalesce((item.value->>'playedPrimaryPosition')::boolean, false),
    player.current_boost
  from jsonb_array_elements(p_assignments) as item(value)
  join public.players player
    on player.id = (item.value->>'playerId')::uuid
   and player.group_id = target_event.group_id;

  update public.events
  set
    status = 'drawn',
    draw_seed = trim(p_seed),
    drawn_by_user_id = auth.uid(),
    team_a_name = trim(p_team_a_name),
    team_b_name = trim(p_team_b_name),
    team_assignments = jsonb_build_object(
      'teams',
      jsonb_build_array(
        jsonb_build_object(
          'id', 'A',
          'name', trim(p_team_a_name),
          'players', (
            select jsonb_agg(
              jsonb_build_object(
                'playerId', mp.player_id,
                'displayName', player.display_name,
                'assignedPosition', mp.assigned_position,
                'playedPrimaryPosition', mp.played_primary_position
              )
            )
            from public.match_participations mp
            join public.players player on player.id = mp.player_id
            where mp.event_id = p_event_id and mp.team = 'A'
          )
        ),
        jsonb_build_object(
          'id', 'B',
          'name', trim(p_team_b_name),
          'players', (
            select jsonb_agg(
              jsonb_build_object(
                'playerId', mp.player_id,
                'displayName', player.display_name,
                'assignedPosition', mp.assigned_position,
                'playedPrimaryPosition', mp.played_primary_position
              )
            )
            from public.match_participations mp
            join public.players player on player.id = mp.player_id
            where mp.event_id = p_event_id and mp.team = 'B'
          )
        )
      )
    )
  where id = p_event_id;

  for notification_row in
    select
      player.user_id,
      mp.player_id,
      mp.team,
      mp.assigned_position
    from public.match_participations mp
    join public.players player on player.id = mp.player_id
    where mp.event_id = p_event_id
      and mp.team in ('A', 'B')
      and player.user_id is not null
  loop
    insert into public.notifications (user_id, type, payload)
    values (
      notification_row.user_id,
      'match_ready',
      jsonb_build_object(
        'event_id', p_event_id,
        'player_id', notification_row.player_id,
        'team', notification_row.team,
        'assigned_position', notification_row.assigned_position,
        'team_name',
        case
          when notification_row.team = 'A' then trim(p_team_a_name)
          else trim(p_team_b_name)
        end
      )
    );
  end loop;
end;
$$;

