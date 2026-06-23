create table public.group_recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  scheduled_time time not null,
  field_name text not null,
  field_maps_url text,
  modality public.modality not null,
  notes text,
  days_ahead smallint not null default 4 check (days_ahead between 1 and 14),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint recurring_name_length check (char_length(trim(field_name)) between 1 and 60),
  constraint recurring_unique_per_day unique (group_id, day_of_week)
);

create index recurring_active_idx on public.group_recurring_schedules(active) where active = true;

alter table public.group_recurring_schedules enable row level security;

create policy recurring_select_admin on public.group_recurring_schedules
  for select using (public.is_group_admin(group_id));
create policy recurring_insert_admin on public.group_recurring_schedules
  for insert with check (public.is_group_admin(group_id));
create policy recurring_update_admin on public.group_recurring_schedules
  for update using (public.is_group_admin(group_id));
create policy recurring_delete_admin on public.group_recurring_schedules
  for delete using (public.is_group_admin(group_id));
