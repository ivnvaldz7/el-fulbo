-- feat-012: notification preferences + RPCs for notifications and push subscriptions

create table public.user_notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  push_enabled boolean not null default false,
  match_reminders boolean not null default true,
  digest_enabled boolean not null default false,
  digest_frequency text not null default 'disabled',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digest_frequency_valid check (
    digest_frequency in ('daily', 'weekly', 'disabled')
  )
);

create trigger trg_notification_prefs_updated_at
  before update on public.user_notification_preferences
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.user_notification_preferences enable row level security;

create policy "prefs_select_own" on public.user_notification_preferences
  for select using (auth.uid() = user_id);

create policy "prefs_insert_own" on public.user_notification_preferences
  for insert with check (auth.uid() = user_id);

create policy "prefs_update_own" on public.user_notification_preferences
  for update using (auth.uid() = user_id);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_select_own'
  ) then
    create policy "notifications_select_own" on public.notifications
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_update_own'
  ) then
    create policy "notifications_update_own" on public.notifications
      for update using (auth.uid() = user_id);
  end if;
end $$;

alter table public.push_subscriptions enable row level security;

create policy "subscriptions_all_own" on public.push_subscriptions
  for all using (auth.uid() = user_id);

-- RPCs
create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read_at = now()
  where id = p_notification_id and user_id = auth.uid() and read_at is null;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
$$;

create or replace function public.get_unread_notification_count()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*) from public.notifications
  where user_id = auth.uid() and read_at is null;
$$;

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
  on conflict(endpoint) do update
  set last_used_at = now(), archived = false;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_subscriptions
  set archived = true
  where endpoint = p_endpoint and user_id = auth.uid();
$$;
