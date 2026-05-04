
-- Create matches table
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) NOT NULL,
    group_id UUID REFERENCES public.groups(id) NOT NULL,
    status TEXT NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view matches related to their groups
CREATE POLICY "Authenticated users can view matches in their groups" ON public.matches
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.group_members
        WHERE group_members.group_id = matches.group_id AND group_members.profile_id = auth.uid()
    )
);

-- Policy for group owners/admins to insert matches
CREATE POLICY "Group owners/admins can insert matches" ON public.matches
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.group_members
        WHERE group_members.group_id = matches.group_id AND group_members.profile_id = auth.uid() AND group_members.is_admin = TRUE
    )
);

-- Policy for group owners/admins to update matches
CREATE POLICY "Group owners/admins can update matches" ON public.matches
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.group_members
        WHERE group_members.group_id = matches.group_id AND group_members.profile_id = auth.uid() AND group_members.is_admin = TRUE
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.group_members
        WHERE group_members.group_id = matches.group_id AND group_members.profile_id = auth.uid() AND group_members.is_admin = TRUE
    )
);


-- Create match_players table
CREATE TABLE public.match_players (
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES public.profiles(id) NOT NULL,
    team_number INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (match_id, player_id)
);

-- Enable RLS for match_players
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view match_players related to their group's matches
CREATE POLICY "Authenticated users can view match players in their group's matches" ON public.match_players
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.matches m
        JOIN public.group_members gm ON m.group_id = gm.group_id
        WHERE m.id = match_players.match_id AND gm.profile_id = auth.uid()
    )
);

-- Policy for group owners/admins to insert match players
CREATE POLICY "Group owners/admins can insert match players" ON public.match_players
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.matches m
        JOIN public.group_members gm ON m.group_id = gm.group_id
        WHERE m.id = match_players.match_id AND gm.profile_id = auth.uid() AND gm.is_admin = TRUE
    )
);

-- Policy for group owners/admins to update match players
CREATE POLICY "Group owners/admins can update match players" ON public.match_players
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.matches m
        JOIN public.group_members gm ON m.group_id = gm.group_id
        WHERE m.id = match_players.match_id AND gm.profile_id = auth.uid() AND gm.is_admin = TRUE
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.matches m
        JOIN public.group_members gm ON m.group_id = gm.group_id
        WHERE m.id = match_players.match_id AND gm.profile_id = auth.uid() AND gm.is_admin = TRUE
    )
);
