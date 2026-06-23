# Tasks: implementa la logica de la fase 5

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500-600 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB+Service) → PR 2 (New Event Form) → PR 3 (Event Detail+Dashboard) |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Database & Services | PR 1 | Create RPCs, types, and event service |
| 2 | Event Creation UI | PR 2 | Build form with localStorage draft and double-submit prevention |
| 3 | Views & Dashboard | PR 3 | Build event details page and update dashboard |

## Phase 1: Foundation / Database

- [ ] 1.1 Create `supabase/migrations/[timestamp]_feat_005_events.sql` with `create_event`, `update_event`, `cancel_event` RPCs.
- [ ] 1.2 Add event types `EventDraft`, `RPC_CreateEventPayload` to `src/lib/types/events.types.ts`.
- [ ] 1.3 Create `src/lib/services/events.service.ts` to expose `createEvent`, `updateEvent`, and `cancelEvent` calling Supabase RPCs.

## Phase 2: Core Implementation (Event Creation)

- [ ] 2.1 Create `src/app/groups/[id]/events/new/page.tsx` with a basic form layout for title, date, time, location, and modality.
- [ ] 2.2 Implement `localStorage` draft saving and auto-fill on mount in the new event form.
- [ ] 2.3 Wire the form submission to `events.service.createEvent` with double-click prevention and draft clearing.
- [ ] 2.4 Add redirect to the new event details page upon successful creation.

## Phase 3: Event Details and Dashboard Updates

- [ ] 3.1 Create `src/app/groups/[id]/events/[event_id]/page.tsx` to display event details (time, location, modality).
- [ ] 3.2 Add edit and cancel actions in `events/[event_id]/page.tsx` connected to the event service RPCs.
- [ ] 3.3 Modify `src/app/groups/[id]/dashboard/page.tsx` to query and display the next active event.

## Phase 4: Testing

- [ ] 4.1 Write unit tests for localStorage draft behavior and form state management.
- [ ] 4.2 Write integration tests mocking Supabase to verify `create_event` payload and duplicate submission prevention.
