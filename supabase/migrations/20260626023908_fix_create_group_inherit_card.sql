-- Fix: Heredar stats de la carta existente al crear un grupo
-- Previamente `create_group` siempre insertaba una carta por defecto (stats en 5, pending_approval)
-- Ahora, si el usuario ya tiene cartas (activas o archivadas), hereda las stats y posiciones
-- de su carta mas relevante, igual que hace `accept_invite_for_user`.

create or replace function public.create_group(
  p_name text,
  p_modality public.modality
)
returns table (
  group_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_group_id uuid;
  v_name text;
  v_has_other_cards boolean;
  v_player public.players%rowtype;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select * into v_user from public.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  v_name := trim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'VALIDATION_ERROR: group name' using errcode = '23514';
  end if;

  if (
    select count(*)
    from public.group_memberships gm
    join public.groups g on g.id = gm.group_id
    where gm.user_id = auth.uid()
      and gm.role = 'admin'
      and g.archived_at is null
  ) >= 3 then
    raise exception 'ADMIN_GROUP_LIMIT_REACHED' using errcode = '23514';
  end if;

  insert into public.groups (name, default_modality, admin_user_id)
  values (v_name, p_modality, auth.uid())
  returning id into v_group_id;

  insert into public.group_memberships (user_id, group_id, role)
  values (auth.uid(), v_group_id, 'admin');

  -- Check if user has ANY other player cards (including archived)
  select exists(
    select 1
    from public.players
    where user_id = auth.uid()
  ) into v_has_other_cards;

  if v_has_other_cards then
    -- Inherit stats from most relevant card, prioritizing active ones
    select * into v_player
    from public.players
    where user_id = auth.uid()
    order by 
      case when archived_at is null then 0 else 1 end,
      joined_at desc
    limit 1;

    insert into public.players (
      user_id,
      group_id,
      display_name,
      photo_url,
      primary_position,
      secondary_position,
      stats,
      is_phantom,
      stats_status
    )
    values (
      auth.uid(),
      v_group_id,
      v_user.display_name,
      v_user.photo_url,
      v_player.primary_position,
      v_player.secondary_position,
      v_player.stats,
      false,
      case
        when v_player.stats_status = 'rejected' then 'pending_approval'::public.stats_status
        else coalesce(v_player.stats_status, 'pending_approval')
      end
    );
  else
    -- New user/first group, use default card
    insert into public.players (
      user_id,
      group_id,
      display_name,
      photo_url,
      primary_position,
      secondary_position,
      stats,
      is_phantom,
      stats_status
    )
    values (
      auth.uid(),
      v_group_id,
      v_user.display_name,
      v_user.photo_url,
      'MED',
      null,
      '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb,
      false,
      'pending_approval'
    );
  end if;

  group_id := v_group_id;
  return next;
end;
$$;
