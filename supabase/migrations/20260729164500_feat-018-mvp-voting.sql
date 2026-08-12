create table if not exists team_match_mvp_votes (
  match_id uuid references team_matches(id) on delete cascade not null,
  voter_id uuid references auth.users(id) on delete cascade not null,
  voted_player_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,

  primary key (match_id, voter_id)
);

-- Enable RLS
alter table team_match_mvp_votes enable row level security;

-- Policy: read
create policy "Team members can read votes for their matches" on team_match_mvp_votes
for select
using (
  exists (
    select 1 from team_matches tm
    join team_members tmem on tmem.team_id = tm.team_id
    where tm.id = team_match_mvp_votes.match_id
    and tmem.user_id = auth.uid()
    and tmem.archived_at is null
  )
);

-- Policy: insert
create policy "Participants can insert their own vote" on team_match_mvp_votes
for insert
with check (
  auth.uid() = voter_id
  and voter_id != voted_player_id
  and exists (
    select 1 from team_match_signups tms
    where tms.team_match_id = match_id
    and tms.user_id = voter_id
    and tms.status = 'going'
  )
);

-- RPC for voting
create or replace function vote_for_team_match_mvp(
  p_team_id uuid,
  p_match_id uuid,
  p_voted_player_id uuid
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_voter_id uuid := auth.uid();
begin
  if v_voter_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from team_matches tm
    where tm.id = p_match_id and tm.team_id = p_team_id
  ) then
    raise exception 'Match does not belong to team';
  end if;

  insert into team_match_mvp_votes (match_id, voter_id, voted_player_id)
  values (p_match_id, v_voter_id, p_voted_player_id);
end;
$$;
