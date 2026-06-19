-- Ensure cancel_event RPC exists with proper permissions.
-- This re-creates the function to guarantee it's in the public schema.
-- The original was defined in feat_005_events.sql but some databases
-- may have missed it due to migration ordering or incomplete applies.

create or replace function public.cancel_event(
  p_event_id uuid,
  p_motive text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_field_name text;
  v_scheduled_at timestamptz;
begin
  select group_id, field_name, scheduled_at
  into v_group_id, v_field_name, v_scheduled_at
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if not public.is_group_admin_or_owner(v_group_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_motive is not null and char_length(trim(p_motive)) > 300 then
    raise exception 'VALIDATION_ERROR: motive too long (max 300)';
  end if;

  update public.events
  set
    status = 'cancelled',
    cancellation_motive = trim(p_motive),
    cancelled_at = now()
  where id = p_event_id;

  insert into public.notifications (user_id, type, payload)
  select
    p.user_id,
    'event_cancelled'::public.notification_type,
    jsonb_build_object(
      'event_id', p_event_id,
      'group_id', v_group_id,
      'field_name', v_field_name,
      'scheduled_at', v_scheduled_at,
      'cancellation_motive', p_motive
    )
  from public.players p
  where p.group_id = v_group_id
    and p.stats_status = 'approved'
    and p.user_id is not null
    and p.archived_at is null;
end;
$$;

-- Rebuild PostgREST schema cache so it picks up the function
notify pgrst, 'reload schema';
