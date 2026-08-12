# Implementation Tasks: Feature 018 - Team MVP Voting

## 1. Database & Security
- [ ] Create a Supabase migration file for the `team_match_mvp_votes` table.
- [ ] Define columns: `match_id`, `voter_id`, `voted_player_id`, `created_at`.
- [ ] Add a composite Primary Key on `(match_id, voter_id)`.
- [ ] Set up Foreign Key constraints for `match_id`, `voter_id`, and `voted_player_id`.
- [ ] Enable RLS on `team_match_mvp_votes`.
- [ ] Add RLS policy: Team members can read votes for their matches.
- [ ] Add RLS policy: Participants can insert their own vote (`voter_id = auth.uid()`), ensuring they don't vote for themselves.

## 2. Types & Service Layer
- [ ] Update `src/lib/types/teams.types.ts` to include vote types (`TeamMatchMvpVote`, etc.).
- [ ] Extend `TeamsService` in `src/lib/services/teams.service.ts` with a `voteForTeamMatchMvp` method.
- [ ] Extend `TeamsService` with a `resolveTeamMatchMvp` method that calculates the max voted player and calls the existing MVP update logic.
- [ ] Add unit and integration tests for the new voting service methods.

## 3. UI: Voting Interface
- [ ] Update `TeamMatchesPanel` (or create a new component) to display the MVP voting interface for finished matches without an assigned MVP.
- [ ] Fetch and display the list of eligible players to vote for (excluding the current user).
- [ ] Show optimistic UI updates when a vote is cast.
- [ ] Display current vote counts (if applicable) so players can see the standings.

## 4. UI: Resolution Interface (Admins)
- [ ] Add a "Resolve MVP" button for admins on finished matches with votes.
- [ ] Implement the handler to call `resolveTeamMatchMvp`.
- [ ] Ensure tie-breaker logic is handled smoothly (e.g., exposing the manual MVP selection dropdown if there is a tie).
- [ ] Verify that real-time Supabase subscriptions update the UI once the MVP is officially resolved.
