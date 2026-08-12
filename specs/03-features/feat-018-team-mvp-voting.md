# Feature 018: Community MVP Voting for Teams

## Purpose

Introduce a community voting system for the Team MVP, replacing or supplementing the manual admin assignment. After a match, players who participated can vote for who they think was the MVP. Finally, an admin resolves the voting to officially assign the MVP based on community consensus.

## Architecture

### Database Schema

A new table `team_match_mvp_votes` will be added to Supabase:
- `match_id` (uuid, references `team_matches.id`, on delete cascade)
- `voter_id` (uuid, references `auth.users.id`, on delete cascade)
- `voted_player_id` (uuid, references `auth.users.id`, on delete cascade)
- `created_at` (timestamptz, default now())
- **Primary Key**: `(match_id, voter_id)` - Ensures only one vote per player per match.

### RLS Policies
- **Read**: Team members can view the votes for matches belonging to their team.
- **Insert**: 
  - Voter is authenticated (`auth.uid() = voter_id`).
  - Voter cannot vote for themselves (`voter_id != voted_player_id`).
  - Voter must have played the match (can be verified via `team_match_signups` where status is 'going').

## Business Logic

1. **Voting Constraints**:
   - Players can vote exactly once per match.
   - Players cannot vote for themselves.
   - Only players who participated in the match can cast a vote.
   
2. **Resolution Flow**:
   - An admin clicks **"Resolve MVP"** on a finished match.
   - The system aggregates the votes and identifies the player with the highest count.
   - The system automatically assigns the most-voted player as the MVP by invoking the existing MVP flow (`setTeamMatchMvp` / `team_matches.mvp_user_id` update).
   - *Tie-breaker*: In the event of a tie, the system can prompt the admin to manually select the MVP, or the admin can use the existing manual override.

## Scenarios

### Scenario: Player votes for MVP
- **GIVEN** a finished match without an official MVP
- **AND** the player participated in the match
- **WHEN** the player selects a teammate to vote for
- **THEN** the vote is registered in `team_match_mvp_votes`
- **AND** the player cannot vote again or vote for themselves

### Scenario: Admin resolves MVP
- **GIVEN** a finished match with community votes
- **WHEN** the admin clicks "Resolve MVP"
- **THEN** the system counts the votes and identifies the most voted player
- **AND** updates the match with the new MVP using the existing logic
