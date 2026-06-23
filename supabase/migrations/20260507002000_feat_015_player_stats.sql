-- feat-015: RPC para stats del jugador con check de membresía de grupo
create or replace function public.get_player_stats(p_player_id uuid)
returns setof public.player_stats_aggregate
language sql
security definer
set search_path = public
as $$
  select *
  from public.player_stats_aggregate
  where player_id = p_player_id
    and group_id in (
      select group_id from public.players
      where user_id = auth.uid() and archived_at is null
    );
$$;

grant execute on function public.get_player_stats(uuid) to authenticated;
