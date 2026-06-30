-- Simplify notifications: drop unused columns, update RPCs for hard delete

-- Drop emailed_at from notifications (was used for digest delivery tracking)
alter table public.notifications drop column if exists emailed_at;

-- Drop archived and last_used_at from push_subscriptions (now hard-delete instead of archive)
drop index if exists public.push_user_idx;
alter table public.push_subscriptions drop column if exists archived;
alter table public.push_subscriptions drop column if exists last_used_at;

-- Recreate index on user_id (without the archived filter)
create index push_user_idx on public.push_subscriptions(user_id);

-- Simplify user_notification_preferences to only push_enabled
alter table public.user_notification_preferences drop column if exists match_reminders;
alter table public.user_notification_preferences drop column if exists digest_enabled;
alter table public.user_notification_preferences drop column if exists digest_frequency;
alter table public.user_notification_preferences drop column if exists timezone;

-- Update delete_push_subscription to hard delete instead of archive
create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id = auth.uid();
$$;

-- Update upsert_push_subscription to remove last_used_at and archived references
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
  insert into public.push_subscriptions(user_id, endpoint, p256dh_key, auth_key, user_agent)
  values(auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict(endpoint) do nothing;
$$;
