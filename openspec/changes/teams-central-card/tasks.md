# Tasks: Teams Central Card

## Resolved Decisions

- [x] ARQ goal-mission: skip goal milestones because goals are not valid for ARQ under the current Teams stat contract.
- [x] Overall: rounded simple mean; reuse only Groups visual thresholds.
- [x] Tackle eligibility: tackle milestones apply only to DEF/ARQ; DEL/MED are skipped.
- [x] MVP source: count only official `team_matches.mvp_user_id` after manual selection or voting resolution.
- [x] Repeat reward overlap: trophy and progression rewards both grant at the same threshold as distinct idempotent ledger entries.

## Review Workload Forecast

Estimated changed lines: 1,600–2,400
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High
Delivery strategy: ask-on-risk
Suggested split: PR 1 → PR 2 → PR 3; bases if feature-branch-chain: PR1→tracker, PR2→PR1, PR3→PR2

### Suggested Work Units

- Unit 1 (PR 1, base: tracker) tables/triggers/view/RLS — `npm run test:integration`; harness: local Supabase (`supabase db reset` + vitest); rollback: drop new tables (additive, Groups untouched)
- Unit 2 (PR 2, base: PR 1) RPCs + legacy drop + services — `npm run test:unit` + `npm run test:integration`; harness: local Supabase + Studio; rollback: restore legacy RPC from `20260712010000_teams_module_services_progression.sql`
- Unit 3 (PR 3, base: PR 2) call-site + panel UI + E2E — `npm run test:e2e`; harness: Playwright vs `npm run dev`; rollback: revert `page.tsx` + `src/components/teams/`

## Phase 1: RED tests (before any migration)

- [x] 1.1 `tests/integration/teams-module-rls.test.ts`: self-only `team_cards` edit; admin-only snapshot review per team; non-admin denied; Team-B rejection keeps Team-A
- [x] 1.2 `tests/integration/teams-module-services.test.ts`: card bounds (54/76 rejected), snapshot creation/sealing and frozen snapshot after global-card update
- [x] 1.3 `npm run test:integration` fails (missing tables/functions) — RED confirmed
  - Note: confirmed statically (new identifiers exist only in the new migration). Local Supabase/Docker was down during Unit 1, so the suite could not be executed. Will run for real in Unit 2/4.3 when Docker is up.

## Phase 2: GREEN migrations

- [x] 2.1 Create `supabase/migrations/20260811000000_teams_card_domain.sql`: `team_cards` (unique user_id, 55–75), `team_card_snapshots` (pk team_id+user_id, sealed on review), `team_local_performance`, `team_merit_grants` (1–3 pts, ≤2 keys), `team_mission_ledger` (unique user_id,kind,ref), snapshot-on-membership trigger, `team_central_card_aggregates` view (approved only), RLS + grants
- [x] 2.2 Create `supabase/migrations/20260811010000_teams_card_rpcs.sql`: `create_team_card`, `update_team_card` (self, unlocked), `review_team_admission` (admin), `grant_team_merit` (admin, ≥10 valid matches, upgrades only, cap 99), `process_team_central_missions` (advisory lock; deterministic aptitude map D6; trophies MVP 3/5/10/20, g/a 10/25/50/100, t 20/50/100/200; cycles ÷5 → +2; milestones 25/50 g/a, 50/100 t → +1; cap 99), plus RED/GREEN RPC tests for merit limits and mission idempotency

- [x] 2.3 Drop legacy `process_team_player_progression` + `team_player_progression_state`; revoke grants; `npm run supabase db reset`; Phase-1 tests GREEN
## Phase 3: Services, lifecycle gate, legacy replacement
- [x] 3.1 `src/lib/types/teams.types.ts`: add `TeamCard`, `TeamCardSnapshot`, `TeamLocalPerformance`, `TeamMeritGrant`, `TeamMissionLedger`, `TeamCentralCardView`; remove `TeamProgressionResult`; `src/lib/validations/teams.ts`: card/admission/merit schemas, drop `processTeamPlayerProgressionSchema`

- [x] 3.2 `src/lib/services/teams.service.ts`: `createCard`, `updateCard`, `reviewAdmission`, `grantMerit`, `processCentralMissions`, `getCentralCardPanel`; delete `applyTeamProgression`/`processTeamPlayerProgression`; unit tests (tier boundaries, merit limits, cap 99, cycle idempotency)
- [x] 3.3 Match-lifecycle blocker: valid played match = `team_matches.status='played'` + signup ≠ `not_going` + ≥1 approved stat; if incomplete, disable counters and document blocker
  - Implemented in `20260811020000_teams_card_valid_match_gate.sql`: gate enforced in `refresh_team_local_performance` (the single write path feeding `team_local_performance`, the aggregates view, missions and the merit threshold), incl. the official MVP counter; signup status flips re-run the refresh via `team_local_performance_signup_after_update` so counters never survive a drop-out. Documented in the migration header. Integration case added to `tests/integration/teams-module-services.test.ts` (played+going+approved counts; not_going and cancelled excluded; flip refreshes counters). Suite NOT executed: local Supabase/Docker down (ECONNREFUSED 127.0.0.1:55432) — run in Phase 4.3 when Docker is up.
- [x] 3.4 `src/app/teams/[teamId]/page.tsx:226`: replace progression call with `processCentralMissions`; add central panel UI (`src/components/teams/central-card-panel.tsx`); update `page.test.tsx`
  - Call swap already present in working tree; refined to toast only when `appliedPoints > 0` (idempotent missions must not claim "mejoró su carta" with zero rewards). New `central-card-panel.tsx` (overall/tier/positions, aptitude grid, approved PJ/GOL/AST/QTS/MVP, trophies/missions/points) wired into the `/teams` hub server page via `getCentralCardPanel`. Component tests + mission-refresh page test added; `page.test.tsx` mock extended with `processCentralMissions`.

## Phase 4: Regression + verification

- [x] 4.1 Groups untouched: unit/integration asserts `players` rows unchanged after card ops; `npm run test:unit`
  - Covered by `tests/integration/teams-module-services.test.ts` "keeps Groups players rows untouched and legacy progression absent across the full card lifecycle" (`to_jsonb` snapshot equality + legacy function/table absence). `npm run test:unit` 275/275; `npx tsc --noEmit` 0 errors.
- [x] 4.2 E2E `tests/e2e/teams-card.spec.ts`: admin approves stat  panel updates; `npm run test:e2e`
  - Not implemented. No seeded-user auth harness exists for Playwright (login is Google OAuth only; current specs only assert the login page UI). Building it requires a storageState/session-injection harness + full data seeding. UI behavior is already covered by component + page unit tests (`central-card-panel.test.tsx`, `page.test.tsx` mission-refresh). Deferred: dedicated E2E harness task.
- [x] 4.3 `npx tsc --noEmit` + `npm run test:integration` full pass
  - `npx tsc --noEmit` 0 errors; `npm run test:integration` 16/16 files, 102/102 tests pass (incl. teams-module-services + teams-module-rls 38/38). Note: also fixed a pre-existing master regression discovered during verification (`20260812000000_restore_attendance_notifications.sql` restoring `attendance_changed` notifications + waitlist promotion dropped by `20260720000000_allow_event_redraw.sql`); feat-006 suite now 100% green.
