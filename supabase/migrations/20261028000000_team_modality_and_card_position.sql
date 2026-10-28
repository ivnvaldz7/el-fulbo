alter table public.teams
  add column if not exists modality public.modality not null default 'F5';

drop function if exists public.create_team(text, public.player_position, public.player_position, text, text, text);

create or replace function public.create_team(
  p_name text,
  p_modality public.modality,
  p_badge_url text default null,
  p_primary_color text default null,
  p_secondary_color text default null
)
returns table (team_id uuid)
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_team public.teams%rowtype;
  v_card public.team_cards%rowtype;
  v_slug_base text;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_card
  from public.team_cards
  where user_id = auth.uid();

  if v_card.user_id is null then
    raise exception 'TEAM_CARD_REQUIRED' using errcode = '23514';
  end if;

  v_slug_base := nullif(app_private.slugify_team_name(p_name), '');
  v_slug := coalesce(v_slug_base, 'team') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.teams (name, slug, modality, badge_url, primary_color, secondary_color, created_by_user_id)
  values (trim(p_name), v_slug, p_modality, p_badge_url, p_primary_color, p_secondary_color, auth.uid())
  returning * into v_team;

  insert into public.team_members (team_id, user_id, role, primary_position, secondary_position, added_by_user_id)
  values (v_team.id, auth.uid(), 'admin', v_card.primary_position, v_card.secondary_position, auth.uid());

  team_id := v_team.id;
  return next;
end;
$$;

revoke all on function public.create_team(text, public.modality, text, text, text) from public, anon;
grant execute on function public.create_team(text, public.modality, text, text, text) to authenticated;
