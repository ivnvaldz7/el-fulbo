# Tasks: Notifications v3 for Vercel Hobby

## Phase 1: Documentation Source of Truth

- [x] 1.1 Create openspec change for notifications v3 under Vercel Hobby constraints.
- [x] 1.2 Rewrite `specs/03-features/feat-012-notifications.md` to match current architecture.
- [x] 1.3 Update `docs/NOTIFICATIONS_GUIDELINES.md` with Vercel Hobby and dispatcher rules.
- [x] 1.4 Update `docs/CURRENT_STATE.md` with deploy failure root cause and next steps.

## Phase 2: Deploy Compatibility

- [ ] 2.1 Change `vercel.json` maintenance cron back to a daily schedule.
- [ ] 2.2 Add a check/test or documented review step that rejects non-daily Hobby cron expressions.

## Phase 3: Dispatcher Architecture

- [ ] 3.1 Generalize dispatcher to support `event_created`, `attendance_changed` and `attendance_reminder`.
- [ ] 3.2 Add immediate server-side dispatch trigger after `create_event`.
- [ ] 3.3 Add immediate server-side dispatch trigger after `update_attendance`.
- [ ] 3.4 Keep dispatcher failures isolated from domain success.

## Phase 4: Attendance Reminder

- [ ] 4.1 Create idempotent outbox rows for `attendance_reminder` in the 0-24h window.
- [ ] 4.2 Exclude players already `going`.
- [ ] 4.3 Exclude phantom players and players without `user_id`.
- [ ] 4.4 Dispatch reminder rows through the same outbox dispatcher.

## Phase 5: Verification

- [ ] 5.1 Unit tests for copy/deeplink for all three critical types.
- [ ] 5.2 Unit tests for dispatcher success/failure and `pushed_at` behavior.
- [ ] 5.3 Integration tests for notification row creation and dedupe.
- [ ] 5.4 Real browser push validation after deploy.
- [ ] 5.5 Do not run `next build` locally, per project rule.

