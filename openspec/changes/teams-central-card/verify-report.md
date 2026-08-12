# Verify Report: teams-central-card

**Verdict**: PASS (E2E task 4.2 deferred with documented limitation)

**Change**: Equipos global player card — card creation, snapshots, local performance, merit grants, central missions and valid-match gate
**Type**: New domain feature (Teams), Groups untouched
**Date**: 2026-08-12

---

## Completeness

| Task | Status | Evidence |
|------|--------|----------|
| 1.1 RLS integration tests (card edit, snapshot review, admin-only) | ✅ Pass | `tests/integration/teams-module-rls.test.ts` green |
| 1.2 Services integration tests (bounds, snapshots, frozen on update) | ✅ Pass | `tests/integration/teams-module-services.test.ts` green |
| 1.3 RED confirmed | ✅ Pass | Static (new identifiers only in new migrations) → later GREEN on real run |
| 2.1 Domain migration | ✅ Pass | `20260811000000_teams_card_domain.sql` applies clean on `supabase db reset` |
| 2.2 RPC migration + merit/mission tests | ✅ Pass | `20260811010000_teams_card_rpcs.sql`; 2 RPC bugs fixed during apply (INOUT via `PERFORM`, MVP cycle refs) |
| 2.3 Legacy drop + reset + Phase-1 GREEN | ✅ Pass | `process_team_player_progression`/state absent (asserted), reset OK |
| 3.1 Types + validations | ✅ Pass | `teams.types.ts`, `teams.ts`; `TeamProgressionResult` removed |
| 3.2 Services + unit tests | ✅ Pass | `createCard`/`updateCard`/`reviewAdmission`/`grantMerit`/`processCentralMissions`/`getCentralCardPanel`; tier boundaries, merit limits, cap 99, cycle idempotency |
| 3.3 Valid-match lifecycle gate | ✅ Pass | `20260811020000_teams_card_valid_match_gate.sql` (gate in `refresh_team_local_performance` + signup-flip trigger); integration case added |
| 3.4 Call-site + panel UI | ✅ Pass | `central-card-panel.tsx` + wiring in `/teams` and `/teams/[teamId]`, toast only when `appliedPoints > 0`; component + page tests |
| 4.1 Groups untouched | ✅ Pass | `to_jsonb` snapshot equality across full lifecycle + legacy absence; unit suite green |
| 4.2 E2E `teams-card.spec.ts` | ⚠️ Deferred | No Playwright auth harness exists (Google OAuth only; harness would need session injection + full seeding). UI covered by component/page unit tests. Dedicated harness task required. |
| 4.3 Full verification | ✅ Pass | See below |

## Build & Test Evidence

| Command | Exit Code | Result |
|---------|-----------|--------|
| `npx tsc --noEmit` | 0 | 0 errors |
| `npm run test:unit` | 0 | 49 files, 275 tests passed |
| `npm run test:integration` | 0 | 16 files, 102 tests passed (teams files 38/38) |
| `npm run supabase:reset` | 0 | 3 new migrations + seed applied clean |

## Bonus Finding During Verification

Regression pre-existing on master (not from this change): `20260720000000_allow_event_redraw.sql` redefined `update_attendance` and silently dropped the `attendance_changed` notifications, waitlist capacity assignment and waitlist promotion added by `20260706010000_attendance_changed_outbox.sql`. 4 feat-006 integration tests were failing. Fixed here (migration-only, tests already existed):

- `supabase/migrations/20260812000000_restore_attendance_notifications.sql` — restores the outbox side-effects while keeping the redraw statuses/`checked_in` columns. Suite went from 98/102 to 102/102.

Follow-up (not blocking): add test coverage for waitlist capacity + promotion restore.

## Deferred Items

- E2E harness for Playwright (session injection via Supabase Auth) to enable `tests/e2e/teams-card.spec.ts`.