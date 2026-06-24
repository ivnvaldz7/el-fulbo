alter table public.events
drop constraint if exists events_played_requires_score,
add constraint events_played_requires_score check (
  status <> 'played'
  or (team_a_score is not null and team_b_score is not null)
);
