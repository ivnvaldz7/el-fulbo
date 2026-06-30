# Tasks: Simplify Notifications

## Phase 1: Dead Code Removal

- [ ] 1.1 Delete `src/components/notifications/notification-badge.tsx`
- [ ] 1.2 Delete `src/lib/notifications.ts`
- [ ] 1.3 Remove `getPendingPushNotifications()` from `src/lib/services/notifications.service.ts`
- [ ] 1.4 Remove `archiveStaleSubscription()`, `touchSubscription()` from `src/lib/services/push-subscription.service.ts`
- [ ] 1.5 Remove `markNotificationPushed()` from `src/lib/services/notifications.service.ts`
- [ ] 1.6 Remove unused NotificationType values and their deep-link/copy from `src/lib/notifications-deeplink.ts`
- [ ] 1.7 Update tests: remove tests for deleted functions, fix imports

## Phase 2: DB Migrations

- [ ] 2.1 Create migration: `DROP COLUMN emailed_at FROM notifications`
- [ ] 2.2 Create migration: drop `archived`, `last_used_at` from `push_subscriptions`; hard-delete on push failure
- [ ] 2.3 Create migration: simplify `user_notification_preferences` — keep only `user_id` PK and `push_enabled` boolean; drop other columns
- [ ] 2.4 Create migration: replace `load_match_result` RPC — remove `mvp_voting_open` notification insert; add `match_result_loaded` to enum

## Phase 3: Push Inline

- [ ] 3.1 Modify `src/lib/services/push-sender.service.ts` — remove `deliverPendingPushes()`, keep `sendPushToUser()` and `sendNotificationPush()` for inline use
- [ ] 3.2 Remove `pushed_at` from `notifications.service.ts` (no longer track it)
- [ ] 3.3 In `closeMvpVoting()` in `events.service.ts`: after RPC success, query event for `mvp_player_id`, lookup user_id, call `sendPushToUser()`

## Phase 4: Cron Unification

- [ ] 4.1 Create `src/app/api/jobs/maintenance/route.ts`: merge logic from `create-recurring-events` + `event-transitions` + new reminder push
- [ ] 4.2 Delete: `push-delivery/route.ts`, `daily-digest/route.ts`, `weekly-digest/route.ts`, `event-transitions/route.ts`, `create-recurring-events/route.ts`
- [ ] 4.3 Update `vercel.json`: replace 5 crons with 1 (`maintenance`); keep `temporary-owners` and `archive-phantoms`

## Phase 5: Shareable Links + Overlays

- [ ] 5.1 Create `src/components/events/attendance-confirmation-overlay.tsx` — modal overlay with "Voy/No voy/Tal vez", calls `update_attendance`
- [ ] 5.2 Create `src/components/events/mvp-voting-overlay.tsx` — modal overlay with participant list, calls `submit_mvp_vote`
- [ ] 5.3 Modify event page: read URL params `?confirmar=` and `?votar-mvp=`, render overlays conditionally
- [ ] 5.4 Modify event page: add "Copiar link de confirmación" button (visible if admin && status === 'confirming')
- [ ] 5.5 Modify result page: add "Compartir votación MVP" button after successful result load

## Phase 6: Verification

- [ ] 6.1 Run `tsc --noEmit` — 0 errors
- [ ] 6.2 Run `vitest run --dir src` — all tests pass (update affected tests)
- [ ] 6.3 Manual: open event with `?confirmar=` param → overlay shows
- [ ] 6.4 Manual: open event with `?votar-mvp=` param → overlay shows
- [ ] 6.5 Manual: admin sees share buttons in correct states

## Implementation Order

Fases 1→2→3→4→5→6. Phase 1 (dead code) y Phase 2 (migrations) son independientes y pueden hacerse en paralelo. Phase 3 (push inline) necesita Phase 2 terminada (columnas DB). Phase 4 (cron) y Phase 5 (overlays) son independientes entre sí pero necesitan Phase 1 y 2.
