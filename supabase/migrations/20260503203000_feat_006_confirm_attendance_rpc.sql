create or replace function update_attendance(
  p_event_id uuid,
  p_status attendance_status
) returns void language plpgsql security definer as $$
declare
  target_event public.events%rowtype;
  target_player public.players%rowtype;
  old_status attendance_status;
  hours_to_event numeric;
begin
  -- Fetch event
  select * into target_event from public.events where id = p_event_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  -- Check status del evento
  if target_event.status not in ('scheduled', 'confirming') then
    raise exception 'CONFLICT: el partido ya arrancó o terminó';
  end if;

  -- Fetch player del user autenticado en este grupo
  select * into target_player from public.players
  where group_id = target_event.group_id
  and user_id = auth.uid()
  and archived_at is null;
  if not found then raise exception 'FORBIDDEN'; end if;

  -- Bloquear si carta pending
  if target_player.stats_status = 'pending_approval' then
    raise exception 'STATS_PENDING_APPROVAL';
  end if;

  -- Fetch status anterior para ver si hay que notificar al admin
  select status into old_status from public.event_attendances
  where event_id = p_event_id and player_id = target_player.id;

  -- Upsert
  insert into public.event_attendances (event_id, player_id, status)
  values (p_event_id, target_player.id, p_status)
  on conflict (event_id, player_id) do update
    set status = p_status, updated_at = now();

  -- Si el Player se bajó (going → not_going o maybe → not_going) y el partido es en < 6h, notificar al admin
  hours_to_event := extract(epoch from (target_event.scheduled_at - now())) / 3600;
  if old_status in ('going', 'maybe') and p_status = 'not_going' and hours_to_event < 6 then
    insert into public.notifications (user_id, type, payload)
    select
      g.admin_user_id,
      'someone_dropped',
      jsonb_build_object(
        'event_id', p_event_id,
        'player_id', target_player.id,
        'player_name', target_player.display_name,
        'hours_to_event', hours_to_event
      )
    from public.groups g
    where g.id = target_event.group_id;
  end if;
end;
$$;