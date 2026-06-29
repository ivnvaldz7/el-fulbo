-- Automatically enable push notifications in user preferences when they opt-in to push subscriptions

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
  -- 1. Insert/update the push subscription
  insert into public.push_subscriptions(user_id, endpoint, p256dh_key, auth_key, user_agent)
  values(auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict(endpoint) do update
  set last_used_at = now(), archived = false;

  -- 2. Automatically enable push_enabled in preferences
  insert into public.user_notification_preferences(user_id, push_enabled)
  values(auth.uid(), true)
  on conflict(user_id) do update
  set push_enabled = true;
$$;
