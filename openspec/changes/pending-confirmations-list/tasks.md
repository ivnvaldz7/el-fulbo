# Tasks: Lista de faltantes de confirmación

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180-320 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Servicio + UI + tests | PR 1 | Mantener scope bajo 400 líneas si no aparece RPC nueva. |

## Phase 1: RED - Service tests

- [x] 1.1 Add failing tests in `src/lib/services/events.service.test.ts` for approved active same-group players without `event_attendances`.
- [x] 1.2 Add failing tests excluding `pending_approval`, rejected/other non-approved statuses, archived players and players from another group.

## Phase 2: GREEN - Service implementation

- [x] 2.1 Add `PendingConfirmationPlayer` contract and `getPendingConfirmationPlayers(groupId, eventId)` in `src/lib/services/events.service.ts`.
- [x] 2.2 Implement ordering consistent with attendance lists: `joined_at` ascending, then `display_name` locale `es`.

## Phase 3: RED - Component/page tests

- [x] 3.1 Create `src/components/event-attendees-list/event-attendees-list.test.tsx` with failing coverage for `Faltan confirmar` count, empty state and names.
- [x] 3.2 Add failing coverage that `Van`, `Lista de espera`, `No van`, `Tal vez` still render the same attendees and counts.

## Phase 4: GREEN - UI wiring

- [x] 4.1 Modify `src/components/event-attendees-list/event-attendees-list.tsx` to accept `pendingConfirmationPlayers` and render `Faltan confirmar` before response sections.
- [x] 4.2 Modify `src/app/groups/[id]/events/[event_id]/page.tsx` to load pending confirmations after `getEventById` and pass them to the list.

## Phase 5: Integration if applicable

- [x] 5.1 If implementation uses direct `players`/`event_attendances` RLS-sensitive queries, add `tests/integration/pending-confirmations-list.test.ts` for a non-admin member. Not needed: this change adds no new RLS policy or RPC and reuses client-visible tables already read on the event page; unit tests cover the new filtering contract.
- [x] 5.2 Verify the integration test excludes external group players and non-approved players. Not needed: covered by service unit tests because no new integration boundary was introduced.

## Phase 6: REFACTOR and verification

- [x] 6.1 Refactor duplicated avatar/list row rendering only after tests are green.
- [x] 6.2 Run targeted component/service tests, then `npm run typecheck` and `npm run test:unit`.
