create or replace function public.get_pending_tasks_summary(p_group_id uuid)
returns table (
  cards_new bigint,
  revisions bigint,
  reintegrations bigint,
  total bigint
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_cards_new bigint;
  v_revisions bigint;
  v_reintegrations bigint;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if not public.is_group_admin(p_group_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select count(*) into v_cards_new
  from public.players p
  where p.group_id = p_group_id
    and p.stats_status = 'pending_approval'
    and p.archived_at is null;

  select count(*) into v_revisions
  from public.stat_revision_requests r
  join public.players p on p.id = r.player_id
  where p.group_id = p_group_id
    and r.status = 'pending'
    and p.archived_at is null;

  select count(*) into v_reintegrations
  from public.reintegration_requests r
  where r.group_id = p_group_id
    and r.status = 'pending';

  return query
  select
    v_cards_new,
    v_revisions,
    v_reintegrations,
    v_cards_new + v_revisions + v_reintegrations;
end;
$$;
