grant usage on schema public to service_role;

grant select on public.group_recurring_schedules to service_role;
grant select on public.groups to service_role;
grant select, insert, update on public.events to service_role;
grant select on public.players to service_role;
grant select on public.event_attendances to service_role;
grant select, update on public.notifications to service_role;
grant select, delete on public.push_subscriptions to service_role;
