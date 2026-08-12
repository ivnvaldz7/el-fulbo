# Design: Teams Central Card

## Technical Approach

Replace Groups-scoped progression with a self-contained Teams card domain: one global `team_cards` row per user; frozen per-team `team_card_snapshots` created on membership; per-team `team_local_performance` fed by approved `team_stat_submissions` + `team_matches.mvp_user_id`; deterministic idempotent mission processing in `process_team_central_missions` writing global stats through the existing aptitude map, capped at 99; central panel reads an approved-only aggregate view. `process_team_player_progression` + `team_player_progression_state` are legacy and dropped; Groups `players` untouched, no backfill.

## Architecture Decisions

| # | Decision | Choice / Rationale |
|---|----------|--------------------|
| D1 | Card storage | Dedicated `team_cards`, unique `user_id`. Isolation requirement; Groups logic never reused. |
| D2 | Lock scope | Stats + positions lock at first snapshot approval (spec mandates positions; stats too, else the player self-upgrades past missions). Rejection resubmit re-submits the locked card. |
| D3 | Overall rating | Rounded simple mean of the card's six stats. "Reuse only visual tier thresholds" — Groups weighting is Groups logic; reuse bronze <70, silver 70-79, gold 80-89 and premium gold >=90 only. |
| D4 | Snapshot lifecycle | Single row per (team, user). Resubmit copies current card values, sets `pending`. Approved rows sealed by trigger (pattern of `seal_team_stat_submission_review`). |
| D5 | MVP source | `team_matches.mvp_user_id` after manual selection or voting resolution is the only official source; vote rows are input only and never advance missions. |
| D6 | Milestone mapping | Static per-position contract reusing existing arrays: DEL [pac,sho,dri], MED [pas,dri,phy], DEF [def,phy,pas], ARQ [div,ref,han]. goals→[sho,pac] (DEL only — `team_member_stat_kind_allowed` blocks goals for ARQ; no offensive GK stat invented), assists→[pas,dri], tackles→[def,div]/[phy,ref] (DEF/ARQ; skipped for DEL/MED cards). |
| D7 | Mission trigger | On-demand after each admin approval (same call site as today) + advisory lock; rerunnable, cron later. |
| D8 | Merit target | Global card stats, recorded in `team_merit_grants`; snapshots stay frozen. |

## Data Flow

```
stat submission → admin review (approved)
     │
     ├─→ team_local_performance (per team,user):
     │     matches_played = distinct played matches with ≥1 approved stat
     │     goals/assists/tackles = Σ approved values
     │     mvps = played matches where mvp_user_id = user
     │
     └─→ process_team_central_missions(user)   [advisory lock]
           Σ local ledgers (approved only) →
           trophies (MVP 3/5/10/20; g/a 10/25/50/100; t 20/50/100/200) → ledger unique(user,kind,ref)
           MVP cycles ÷5 → +2 to each aptitude-map key (cap 99) → ledger(user,kind,cycle)
           milestones (g 25/50, a 25/50, t 50/100) → +1 to mapped key → ledger
           update team_cards.stats
                ↓
   team_card_snapshots (frozen) ← never modified by upgrades
   central panel ← team_central_card_aggregates (view, approved only)
```

Membership: `accept_team_invite`/`add_team_member` trigger inserts a snapshot copying card values (`pending`); no card → `draft`, resubmit after creation.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/20260811000000_teams_card_domain.sql` | Create | `team_cards`, `team_card_snapshots`, `team_local_performance`, `team_merit_grants`, `team_mission_ledger`, `team_central_card_aggregates` view, membership + seal triggers, RLS + grants |
| `supabase/migrations/20260811010000_teams_card_rpcs.sql` | Create | `create_team_card`, `update_team_card`, `review_team_admission`, `grant_team_merit`, `process_team_central_missions`; drop legacy RPC + state; revoke legacy grants |
| `src/lib/types/teams.types.ts` | Modify | Add `TeamCard`, `TeamCardSnapshot`, `TeamLocalPerformance`, `TeamMeritGrant`, `TeamMissionLedger`, `TeamCentralCardView`; remove `TeamProgressionResult` |
| `src/lib/validations/teams.ts` | Modify | Add card/admission/merit schemas; drop progression schema |
| `src/lib/services/teams.service.ts` | Modify | Drop `applyTeamProgression`/`processTeamPlayerProgression`; add card/admission/merit/mission methods |
| `src/app/teams/[teamId]/page.tsx` | Modify | Replace progression call with `processTeamCentralMissions` |
| `tests/integration/teams-module-*.test.ts` | Modify | Replace progression cases; add new domain cases |

## Interfaces / Contracts

```sql
team_cards(user_id pk, stats jsonb, positions, positions_locked_at,
           check: all stats 55–75; stats shape matches primary position)
team_card_snapshots(team_id, user_id, card_stats jsonb, positions,
           status draft|pending|approved|rejected, reviewed_by, reviewed_at, reason,
           pk (team_id, user_id); approved/rejected sealed)
team_local_performance(team_id, user_id, matches_played, goals, assists, tackles, mvps,
           pk (team_id, user_id))
team_merit_grants(id, team_id, user_id, stat_keys jsonb, points_total,
           check: 1–3 points, ≤2 keys)
team_mission_ledger(user_id, kind trophy|mvp_cycle|milestone, ref, stat_key, points,
           unique (user_id, kind, ref))
```

RPCs: `create_team_card`/`update_team_card` (self, while unlocked); `review_team_admission` (admin, per team); `grant_team_merit` (admin; matches_played ≥ 10; upgrades only; cap 99); `process_team_central_missions(user_id)` (advisory lock `hashtextextended('team_central_missions:'||user_id,0)`; idempotent via unique ledger).

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Schemas (55–75, positions), tier boundaries, MVP/milestone math, cap 99, merit limits | Vitest on new service helpers |
| Integration | Build → admission → review → ledger → missions → aggregation; rejection/resubmit; frozen snapshot after upgrade; ARQ no-goal mission; double-run idempotency; RLS self/admin | Extend `teams-module-*.test.ts` |
| E2E | Admin approves stat → card/panel updates | Existing smoke suite |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

Two additive migrations; no backfill from Groups. Legacy RPC/state dropped in the same change (call site removed in the same PR). Rollback: revert PR + re-run legacy migration; Groups `players` never modified.

## Open Questions

- [x] Stats and positions lock together at first team approval; later changes require an approved merit.
- [x] Tackle milestones for DEL/MED cards: skipped; only DEF and ARQ can generate valid tackle performance.
- [x] MVP counts use `mvp_user_id` only after manual selection or voting resolution.
- [x] Overlapping trophy and progression rewards are independent ledger entries at the same threshold.
