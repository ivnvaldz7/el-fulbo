-- Add team_assignments to events table
ALTER TABLE public.events
ADD COLUMN team_assignments JSONB NULL;
-- The original draft also tried to recreate `match_participations` and its
-- policies, but those already exist in the canonical initial schema.
-- Keeping only the additive `team_assignments` column avoids duplicate-object
-- failures on future database resets.
