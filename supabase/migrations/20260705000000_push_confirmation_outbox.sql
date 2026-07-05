-- Push confirmation V1: outbox metadata + idempotent notification helper

alter table public.notifications
  add column if not exists dedupe_key text,
  add column if not exists push_attempted_at timestamptz,
  add column if not exists push_attempt_count integer not null default 0,
  add column if not exists push_last_error text;

create unique index if not exists notifications_user_dedupe_key_unique
  on public.notifications(user_id, dedupe_key);

create or replace function public.create_notification_once(
  p_user_id uuid,
  p_type public.notification_type,
  p_payload jsonb,
  p_dedupe_key text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (user_id, type, payload, dedupe_key)
  values (p_user_id, p_type, p_payload, p_dedupe_key)
  on conflict (user_id, dedupe_key) do nothing
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke execute on function public.create_notification_once(uuid, public.notification_type, jsonb, text) from public;
revoke execute on function public.create_notification_once(uuid, public.notification_type, jsonb, text) from anon;
revoke execute on function public.create_notification_once(uuid, public.notification_type, jsonb, text) from authenticated;
grant execute on function public.create_notification_once(uuid, public.notification_type, jsonb, text) to service_role;

create or replace function public.upsert_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  with subscription as (
    insert into public.push_subscriptions(user_id, endpoint, p256dh_key, auth_key, user_agent)
    values(auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
    on conflict(endpoint) do nothing
  ),
  prefs as (
    insert into public.user_notification_preferences(user_id, push_enabled)
    values (auth.uid(), true)
    on conflict (user_id) do update
      set push_enabled = true
  )
  select 1;
$$;

create or replace function public.create_event(
  p_group_id UUID,
  p_modality public.modality,
  p_field_name TEXT,
  p_field_maps_url TEXT,
  p_scheduled_at TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF NOT (public.is_group_admin(p_group_id) OR public.is_group_owner(p_group_id)) THEN
      RAISE EXCEPTION 'Unauthorized: Only group owners or admins can create events.';
  END IF;

  IF p_scheduled_at < now() + interval '1 hour' THEN
      RAISE EXCEPTION 'Scheduled time must be at least 1 hour in the future.';
  END IF;
  IF p_scheduled_at > now() + interval '90 days' THEN
      RAISE EXCEPTION 'Scheduled time cannot be more than 90 days in the future.';
  END IF;

  INSERT INTO public.events (
    group_id,
    scheduled_at,
    field_name,
    modality,
    created_by_user_id,
    field_maps_url,
    notes,
    status
  ) VALUES (
    p_group_id,
    p_scheduled_at,
    trim(p_field_name),
    p_modality,
    auth.uid(),
    p_field_maps_url,
    trim(p_notes),
    'scheduled'
  ) RETURNING id INTO v_event_id;

  PERFORM public.create_notification_once(
    p.user_id,
    'event_created'::public.notification_type,
    jsonb_build_object(
      'event_id', v_event_id,
      'group_id', p_group_id,
      'field_name', p_field_name,
      'scheduled_at', p_scheduled_at
    ),
    'event_created:' || v_event_id::text || ':' || p.user_id::text
  )
  FROM public.players p
  WHERE p.group_id = p_group_id
    AND p.stats_status = 'approved'
    AND p.user_id IS NOT NULL
    AND p.is_phantom = false
    AND p.archived_at IS NULL;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
