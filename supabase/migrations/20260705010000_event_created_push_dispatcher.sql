create or replace function public.claim_event_created_push_notifications(
  p_limit integer default 50,
  p_max_attempts integer default 3
)
returns table (
  notification_id uuid,
  user_id uuid,
  type public.notification_type,
  payload jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select n.id
    from public.notifications n
    where n.pushed_at is null
      and n.type = 'event_created'::public.notification_type
      and n.push_attempt_count < p_max_attempts
      and exists (
        select 1
        from public.user_notification_preferences pref
        where pref.user_id = n.user_id
          and pref.push_enabled = true
      )
      and exists (
        select 1
        from public.push_subscriptions sub
        where sub.user_id = n.user_id
      )
      and (
        (
          n.payload ? 'scheduled_at'
          and n.payload->>'scheduled_at' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
          and (n.payload->>'scheduled_at')::timestamptz > now()
        )
        or (
          not (
            n.payload ? 'scheduled_at'
            and n.payload->>'scheduled_at' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
          )
          and n.created_at >= now() - interval '24 hours'
        )
      )
    order by n.created_at asc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
    for update skip locked
  )
  update public.notifications n
  set
    push_attempted_at = now(),
    push_attempt_count = n.push_attempt_count + 1
  from candidates c
  where n.id = c.id
  returning n.id, n.user_id, n.type, n.payload;
end;
$$;

comment on function public.claim_event_created_push_notifications(integer, integer)
  is 'Claims event_created push outbox rows. scheduled_at in the payload is authoritative: past events are skipped; missing or non-ISO scheduled_at falls back to recent created_at only.';

revoke execute on function public.claim_event_created_push_notifications(integer, integer) from public;
revoke execute on function public.claim_event_created_push_notifications(integer, integer) from anon;
revoke execute on function public.claim_event_created_push_notifications(integer, integer) from authenticated;
grant execute on function public.claim_event_created_push_notifications(integer, integer) to service_role;
