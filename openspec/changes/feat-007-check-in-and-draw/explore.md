# Explore Report: feat-007 - Check-in y sorteo

## Goal
To understand the scope and potential impact of the "feat-007: check-in and draw" change, identify relevant files, modules, and architectural considerations, and determine where this new feature would best fit.

## Summary of Feature "Check-in y sorteo"

This feature introduces a multi-step process for Admins/Owners to manage event attendance and perform a balanced team draw.

1.  **Check-in:** Admins/Owners can mark players as "checked-in" for an event. This includes individual toggles, a "Mark all 'going'" button, and the ability to add phantom players. This updates `event_attendances.checked_in` and transitions `events.status` to `checked_in`.
2.  **Draw:** A client-side balanced team draw is executed. It involves pre-draw validations (e.g., sufficient goalkeepers, even number of players) with interactive user resolution, a visual animation, and the display of balanced teams with overall differences and warnings.
3.  **Manual Editing:** Admins can manually adjust teams via drag-and-drop, including moving players to a "substitute" bench.
4.  **Confirmation:** The final draw is confirmed, updating `events.status` to `drawn`, persisting `match_participations` records (including `boost_applied` snapshot), and sending `match_ready` notifications to all participants.
5.  **Sharing:** An image of the finalized teams can be shared.

## Architectural Considerations and Impact

### UI / Frontend
*   **New Routes:** Dedicated routes for check-in (`/groups/{id}/events/{event_id}/check-in`) and draw (`/groups/{id}/events/{event_id}/draw`) will be needed.
*   **Event Page (`src/app/groups/[id]/events/[event_id]/page.tsx`):** Will need to display the "Hacer check-in" button based on event status and user role.
*   **Check-in Components:** New components for the check-in screen, including player lists with toggles, "Mark all" button, and integration with the "add phantom player" feature (from `feat-013`). `src/components/EventAttendeesList.tsx` and `src/components/ConfirmAttendance.jsx` are relevant here.
*   **Draw Components:** New components for the draw animation (using Framer Motion), the results display (two teams, player cards, overall diff, warnings), and manual editing (drag-and-drop).
*   **Modals (`src/components/ui/confirmation-modal.tsx`):** Will be heavily used for pre-draw validations and user choices.
*   **State Management:** Significant client-side state will be required for the check-in process, the draw algorithm, and manual editing.

### API / Backend (`src/app/api`)
*   **`update_checkin` RPC:** A new API endpoint (e.g., `src/app/api/events/[eventId]/attendees/[userId]/check-in/route.ts`) to handle real-time updates of player `checked_in` status.
*   **`confirm_draw` RPC:** A new API endpoint (e.g., `src/app/api/events/[eventId]/draw/confirm/route.ts`) to receive the final draw assignments, update `events` status, and insert into `match_participations`.
*   **Real-time (`src/app/api/socket/route.ts`, `src/lib/socket.ts`):** Crucial for synchronizing check-in toggles across multiple admin/owner devices.

### Services (`src/lib/services`)
*   **`events.service.ts`:** Will be extended to handle event status transitions (`checked_in`, `drawn`), update `draw_seed`, `drawn_by_user_id`, `team_a_name`, `team_b_name`, and retrieve event data relevant to the draw.
*   **`eventAttendees.ts`:** Will be central to managing `event_attendances` records, especially `checked_in` status.
*   **`player.service.ts`:** May need modifications or additions related to fetching `PlayerForDraw` data and potentially for adding phantom players.
*   **`notificationSender.service.ts`:** Will be used to send the new `match_ready` notifications.
*   **`draw.service.ts` (new):** A dedicated client-side service to encapsulate the balancing algorithm (Phases 0-3), including `getTeamSize`, `shuffle`, `best_candidate_for_position`, and `calculate_boost`. This will be pure logic, isolated from UI.

### Data Models / Types / Validations (`src/lib/types`, `specs/04-contracts/types.ts`, `src/lib/validations`)
*   **New Types:** `DrawInput`, `DrawResult`, `DrawAssignment`, `DrawWarning`, `ParticipationTeam`, and `PlayerForDraw` will need to be defined in `src/lib/types.ts` or a new `src/lib/types/draw.ts`.
*   **`confirmDrawSchema`:** A Zod schema (likely in `src/lib/validations/draw.ts` or `event.ts`) for validating the input to the `confirm_draw` RPC.

### Database Schema (`specs/04-contracts/db-schema.md`, `supabase/migrations`)
*   **Enums:** `notification_type` enum has been updated to include `match_ready` via a new migration.
*   **`public.events`:** Existing `status`, `draw_seed`, `drawn_by_user_id`, `team_a_name`, `team_b_name` fields will be utilized.
*   **`public.players`:** Existing `stats`, `current_boost`, `is_phantom`, `primary_position`, `secondary_position` fields are crucial for the draw algorithm.
*   **`public.event_attendances`:** The `checked_in` boolean field and `checked_in_at` timestamp are directly used by the check-in feature.
*   **`public.match_participations`:** This table is perfectly designed for storing the draw results, including `team`, `assigned_position`, `played_primary_position`, and `boost_applied`.
*   **`apply_match_outcome` function:** While part of `feat-008`, its interaction with `boost_applied` is noted.

## Relevant Files Identified

*   `specs/03-features/feat-007-check-in-and-draw.md` (Primary Spec)
*   `specs/02-flows/core-flows.md` (Flows 8 & 10)
*   `specs/01-domain/balancing-algorithm.md` (Core Algorithm Logic)
*   `specs/04-contracts/db-schema.md` (Database Schema)
*   `supabase/migrations/20260504002107_add_match_ready_notification_type.sql` (New Migration)
*   `src/app/groups/[id]/events/[event_id]/page.tsx` (Event Detail Page - UI entry point)
*   `src/app/api/events/[eventId]/attendees/[userId]/check-in/route.ts` (Potential new API for check-in)
*   `src/app/api/events/[eventId]/draw/confirm/route.ts` (Potential new API for draw confirmation)
*   `src/app/api/socket/route.ts` (Real-time updates)
*   `src/lib/socket.ts` (Real-time client)
*   `src/components/EventAttendeesList.tsx` (Likely used in check-in UI)
*   `src/components/ConfirmAttendance.jsx` (Potentially reusable in check-in UI)
*   `src/components/ui/confirmation-modal.tsx` (For draw validation modals)
*   `src/lib/services/events.service.ts`
*   `src/lib/services/eventAttendees.ts`
*   `src/lib/services/player.service.ts`
*   `src/lib/services/notificationSender.service.ts`
*   `src/lib/types.ts` (for new types)
*   `src/lib/validations/event.ts` or new `src/lib/validations/draw.ts` (for Zod schema)

## Next Steps

The exploration phase is complete. The next step would be to proceed with the design phase, using this detailed understanding to create a technical design document for the feature.
