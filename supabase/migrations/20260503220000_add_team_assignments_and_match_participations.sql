-- Add team_assignments to events table
ALTER TABLE public.events
ADD COLUMN team_assignments JSONB NULL;

-- Create match_participations table
CREATE TABLE public.match_participations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team public.participation_team not null,
  assigned_position public.player_position, -- Can be null for substitutes
  played_primary_position boolean not null default true,
  boost_applied jsonb,
  created_at timestamptz not null default now(),
  constraint participations_unique unique (event_id, player_id),
  constraint participations_position_required check (
    (team = 'substitute' and assigned_position is null)
    or (team <> 'substitute' and assigned_position is not null)
  )
);

-- Add index for efficient lookups
CREATE INDEX participations_event_player_idx ON public.match_participations (event_id, player_id);

-- Update RLS for match_participations
ALTER TABLE public.match_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY participations_select_member ON public.match_participations FOR SELECT USING (
  public.is_group_member((select group_id from public.events where id = event_id))
);

CREATE POLICY participations_write_admin_owner ON public.match_participations FOR ALL USING (
  public.is_group_admin_or_owner((select group_id from public.events where id = event_id))
) WITH CHECK (
  public.is_group_admin_or_owner((select group_id from public.events where id = event_id))
);

-- Note: The `participation_team` enum should already exist from initial schema.
