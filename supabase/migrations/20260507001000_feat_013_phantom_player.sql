-- feat-013: phantom player — creación, resolución y conversión a real

create table public.phantom_conversion_tokens (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  email text not null,
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.phantom_conversion_tokens enable row level security;

create index phantom_tokens_player_idx on public.phantom_conversion_tokens(player_id);
create index phantom_tokens_token_idx on public.phantom_conversion_tokens(token) where used_at is null;

-- Crear player fantasma durante check-in
create or replace function public.create_phantom_player(
  p_group_id uuid,
  p_event_id uuid,
  p_name text,
  p_primary_position public.player_position default 'MED'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_player_id uuid;
  default_stats jsonb;
begin
  if not (is_group_admin(p_group_id) or is_group_owner(p_group_id)) then
    raise exception 'FORBIDDEN';
  end if;

  if (select count(*) from public.players
      where group_id = p_group_id and archived_at is null) >= 50 then
    raise exception 'PLAYER_GROUP_LIMIT_REACHED';
  end if;

  if p_primary_position = 'ARQ' then
    default_stats := '{"div":6,"han":6,"kic":6,"ref":6,"spd":6,"pos":6}'::jsonb;
  else
    default_stats := '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb;
  end if;

  insert into public.players (
    user_id, group_id, display_name, primary_position,
    stats_status, stats, is_phantom
  ) values (
    null, p_group_id, trim(p_name), p_primary_position,
    'approved', default_stats, true
  ) returning id into new_player_id;

  insert into public.event_attendances (event_id, player_id, status, checked_in, checked_in_at)
  values (p_event_id, new_player_id, 'going', true, now());

  return new_player_id;
end;
$$;

-- Archivar fantasma
create or replace function public.archive_phantom_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select group_id into v_group_id from public.players
  where id = p_player_id and is_phantom = true;

  if v_group_id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not (is_group_admin(v_group_id) or is_group_owner(v_group_id)) then
    raise exception 'FORBIDDEN';
  end if;

  update public.players
  set archived_at = now()
  where id = p_player_id;
end;
$$;

-- Hard delete de fantasma
create or replace function public.delete_phantom_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select group_id into v_group_id from public.players
  where id = p_player_id and is_phantom = true;

  if v_group_id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not (is_group_admin(v_group_id) or is_group_owner(v_group_id)) then
    raise exception 'FORBIDDEN';
  end if;

  delete from public.players where id = p_player_id;
end;
$$;

-- Iniciar conversión de fantasma → token magic link
create or replace function public.initiate_phantom_conversion(
  p_player_id uuid,
  p_email text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_token text;
begin
  select group_id into v_group_id from public.players
  where id = p_player_id and is_phantom = true and archived_at is null;

  if v_group_id is null then
    raise exception 'NOT_FOUND';
  end if;

  if not (is_group_admin(v_group_id) or is_group_owner(v_group_id)) then
    raise exception 'FORBIDDEN';
  end if;

  -- Invalidar tokens previos del mismo player
  update public.phantom_conversion_tokens
  set used_at = now()
  where player_id = p_player_id and used_at is null;

  insert into public.phantom_conversion_tokens(player_id, group_id, email)
  values(p_player_id, v_group_id, p_email)
  returning token into v_token;

  return v_token;
end;
$$;

-- Completar conversión al aceptar el link
create or replace function public.complete_phantom_conversion(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select * into v_row
  from public.phantom_conversion_tokens
  where token = p_token and used_at is null and expires_at > now();

  if not found then
    raise exception 'TOKEN_INVALID_OR_EXPIRED';
  end if;

  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  update public.players
  set user_id = auth.uid(), is_phantom = false, joined_at = now()
  where id = v_row.player_id;

  update public.phantom_conversion_tokens
  set used_at = now()
  where id = v_row.id;
end;
$$;

-- Cron: archivar fantasmas sin resolver después de 7 días
create or replace function public.archive_stale_phantoms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  archived_count integer;
begin
  update public.players
  set archived_at = now()
  where is_phantom = true
    and archived_at is null
    and joined_at < now() - interval '7 days'
    and not exists (
      select 1 from public.event_attendances ea
      join public.events e on e.id = ea.event_id
      where ea.player_id = players.id
        and e.scheduled_at > now()
        and e.status not in ('cancelled', 'played')
    );

  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;
