# Design: Teams Module

## Technical Approach

`Equipos` will be introduced as a sibling domain to `Grupos`, not as a separate app. The existing shell, auth, visual language, and share/export patterns remain intact; the change is mostly additive.
The app entry becomes a hub selector: users arrive, choose `Grupos` or `Equipos`, then enter the corresponding dashboard.

The module will live under `src/app/teams/*` with a single team detail surface that uses tabs for Members, Matches, Stats, Card, and Moderation. This keeps navigation compact and reuses the current “one shell, many surfaces” pattern already used by player profiles and group dashboards.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| App split | Keep `/groups` and `/teams` as peer sections behind a selector hub | New app shell or root hub rewrite | Minimizes disruption and reuses existing navigation patterns |
| Detail navigation | One team detail page with tabs | Separate pages for every surface | Reduces route sprawl and duplicate layout code |
| Stats lifecycle | Player submits, admin approves/rejects; only approved rows aggregate and progress | Auto-accept or direct mutation | Preserves auditability and prevents false or incorrect stats from counting |
| Position model | Reuse existing primary and secondary positions | New team-specific role system | Avoids duplicate player identity rules |
| Base progression | Count 3 MVPs and 3-win streaks globally | Team-only progression | Ensures the player's base card evolves and travels across teams |
| Win streak eligibility | Count a win only when the player has an approved post-match stat submission for that match | Count all team wins or any submitted stat | Uses admin-approved stats as valid participation evidence and rejects false or incorrect submissions from progression |
| MVP progression cadence | Apply rewards at every multiple of 3 MVPs | One-time reward at first 3 MVPs | Keeps long-term progression active |
| Progression allocation | App assigns stat rewards automatically by primary position | Player chooses stats manually | Reduces gaming and keeps progression consistent |
| Progression cap | Max stat value is 99 | Unbounded progression | Keeps cards readable and prevents runaway values |
| Card tier visuals | Calculate bronce, plata, oro, oro premium from overall | Tier by milestone count | Keeps visual tier tied to actual card strength |
| Team MVP duration | MVP lasts until the next team match | Permanent MVP badge | Keeps MVP as a per-match recognition and forces post-match renewal |
| Aggregation source | Approved submissions only | Live client aggregation or denormalized writes | Keeps source of truth in the DB and avoids drift |
| Card rendering | New `TeamCardArtwork` + `TeamShareableCard` | Reuse player card markup directly | Reuses the visual language while keeping team-specific fields explicit |

## Data Flow

```text
User -> / -> selector hub -> /groups -> Groups dashboard
                      └──-> /teams -> Team hub
                                   -> /teams/[teamId] -> tabs (Members | Matches | Stats | Card | Moderation)

Match flow:
Admin creates match -> Members sign up -> match finishes
Player submits role-based stat -> admin approves/rejects
Approved rows -> team aggregates/view -> team card/shareable image
Rejected rows -> treated as false/incorrect -> no aggregate and no progression

Progression flow:
Approved match outcomes + approved player stat submission -> global milestones -> permanent base card progression
                      └──-> team-local history -> team-specific variation

MVP flow:
Post-match MVP vote -> current team MVP until next match
                    -> global MVP counter
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/page.tsx` | Modify | Hub selector landing that routes to `Grupos` or `Equipos` |
| `src/app/teams/page.tsx` | Create | Teams hub with list of teams and entry to create/join/manage |
| `src/app/teams/[teamId]/page.tsx` | Create | Team detail shell with tabs |
| `src/app/invite/[code]/*` | Modify | Reuse the existing invite/join UX for team membership |
| `src/app/teams/[teamId]/members/page.tsx` | Create | Roster management surface |
| `src/app/teams/[teamId]/matches/page.tsx` | Create | Team matches list and match entry |
| `src/app/teams/[teamId]/matches/[matchId]/page.tsx` | Create | Match detail, sign-up, submission, and moderation entry |
| `src/app/teams/[teamId]/stats/page.tsx` | Create | Aggregated team stats view |
| `src/components/teams/team-card-artwork.tsx` | Create | Team-specific visual card primitive |
| `src/components/share/team-shareable-card.tsx` | Create | Shareable team card wrapper using the existing share pipeline |
| `src/lib/services/teams.service.ts` | Create | Team domain orchestration |
| `src/lib/validations/teams.ts` | Create | Zod schemas for team inputs |
| `src/lib/routes.ts` | Modify | Add route helpers for teams |
| `supabase/migrations/*` | Create | Team tables, approvals, and RLS |

## Interfaces / Contracts

```ts
type TeamStatKind = 'goals' | 'assists' | 'tackles';
type TeamSubmissionStatus = 'pending' | 'approved' | 'rejected';

interface TeamMember {
  id: string;
  teamId: string;
  playerId: string;
  primaryPosition: string;
  secondaryPosition: string | null;
  isAdmin: boolean;
}

interface TeamStatSubmission {
  id: string;
  teamId: string;
  matchId: string;
  playerId: string;
  statKind: TeamStatKind;
  value: number;
  status: TeamSubmissionStatus;
  reviewedBy: string | null;
}
```

The team aggregate should read only approved submissions. Rejected submissions are treated as false or incorrect for computation and must not aggregate, prove participation, or unlock progression.
The base card progression should read global player milestones and assign stat rewards automatically from the player's primary position, while team-local variations should remain scoped to a team. Win-streak milestones should include only wins from matches where the player has an approved post-match stat submission. Current team MVP is temporary and expires at the next team match.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | submission validation, role-to-stat mapping, approval rules, aggregate math | service tests in `src/lib/services/*` |
| Integration | DB inserts, RLS, admin approval, approved-only aggregation | Supabase-backed tests for the new tables/RPCs |
| E2E | section switch, team creation flow, sign-up, submission, approval, card share | Playwright happy path and key permission paths |

## Migration / Rollout

No migration of existing group data is required. This is a schema expansion only: new tables, new views/RPCs, and new routes. The existing `Grupos` flow remains untouched.

## Open Questions

None.



