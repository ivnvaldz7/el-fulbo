create or replace function public.get_admin_tasks_detail(p_group_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_cards_new jsonb;
  v_revisions jsonb;
  v_reintegrations jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if not public.is_group_admin(p_group_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by overdue desc, created_at asc), '[]'::jsonb) into v_cards_new
  from (
    select jsonb_build_object(
      'player_id', p.id,
      'player_name', p.display_name,
      'created_at', p.joined_at,
      'overdue', (p.joined_at <= now() - interval '7 days')
    ) as item,
    (p.joined_at <= now() - interval '7 days') as overdue,
    p.joined_at as created_at
    from public.players p
    where p.group_id = p_group_id
      and p.stats_status = 'pending_approval'
      and p.archived_at is null
  ) cards;

  select coalesce(jsonb_agg(item order by overdue desc, created_at asc), '[]'::jsonb) into v_revisions
  from (
    select jsonb_build_object(
      'request_id', r.id,
      'player_id', p.id,
      'player_name', p.display_name,
      'created_at', r.created_at,
      'overdue', (r.created_at <= now() - interval '7 days')
    ) as item,
    (r.created_at <= now() - interval '7 days') as overdue,
    r.created_at as created_at
    from public.stat_revision_requests r
    join public.players p on p.id = r.player_id
    where p.group_id = p_group_id
      and r.status = 'pending'
      and p.archived_at is null
  ) revisions;

  select coalesce(jsonb_agg(item order by overdue desc, created_at asc), '[]'::jsonb) into v_reintegrations
  from (
    select jsonb_build_object(
      'request_id', r.id,
      'player_id', p.id,
      'player_name', p.display_name,
      'created_at', r.created_at,
      'overdue', (r.created_at <= now() - interval '7 days')
    ) as item,
    (r.created_at <= now() - interval '7 days') as overdue,
    r.created_at as created_at
    from public.reintegration_requests r
    join public.players p on p.id = r.player_id
    where r.group_id = p_group_id
      and r.status = 'pending'
  ) reintegrations;

  return jsonb_build_object(
    'cards_new', v_cards_new,
    'revisions', v_revisions,
    'reintegrations', v_reintegrations
  );
end;
$$;
