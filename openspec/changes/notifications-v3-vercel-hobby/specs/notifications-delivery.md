# Spec: Notifications Delivery under Vercel Hobby

## Requirement: Outbox source of truth

Every pushable notification MUST be represented first as a row in `public.notifications`.

### Scenario: Event created notification

Given an admin or owner creates an event
When the event is persisted successfully
Then `event_created` notification rows MUST exist for eligible recipients
And each row MUST have a non-null `dedupe_key`
And push delivery MUST use those rows as input.

### Scenario: Attendance changed notification

Given a player changes attendance to `going` or `not_going`
When the effective status changed from the previous status
Then `attendance_changed` rows MUST be created for the group admin and fixed owners
And the actor MUST NOT receive their own notification
And each recipient MUST have a unique `dedupe_key`.

### Scenario: Attendance reminder notification

Given an event starts within the reminder window
When a player has not confirmed `going`
Then an `attendance_reminder` row SHOULD be created for that player
And the row MUST be idempotent through `dedupe_key`
And phantom players or players without `user_id` MUST be excluded.

## Requirement: Immediate server-side dispatch

Critical match notifications SHOULD be dispatched immediately from a server-side trigger after the domain event succeeds.

### Scenario: Immediate dispatch succeeds

Given pushable rows were created
When the server-side trigger runs
Then the dispatcher MUST claim eligible rows
And send Web Push to active subscriptions
And set `pushed_at` only for rows where delivery `sent > 0`.

### Scenario: Immediate dispatch fails

Given pushable rows were created
When the server-side trigger fails
Then the domain action MUST remain successful
And the rows MUST remain available for retry
And the error SHOULD be diagnostic, not silent.

## Requirement: Daily fallback only

Vercel Hobby cron jobs MUST NOT run more than once per day.

### Scenario: Cron expression is too frequent

Given the project is deployed on Vercel Hobby
When `vercel.json` contains a cron expression that runs more than once per day
Then deployment will fail
And the expression MUST be changed before deploy.

### Scenario: Daily fallback processes pending rows

Given pending pushable rows remain without `pushed_at`
When `/api/jobs/maintenance` runs daily
Then it SHOULD dispatch eligible rows
And respect max attempts
And isolate dispatcher failures from the rest of maintenance.

## Requirement: Minimal user-facing notification center

The existing notification center SHOULD remain focused and operational.

### Scenario: User opens notifications feed

Given a user has notifications
When they open `/notifications`
Then they SHOULD see recent notifications ordered by creation date
And each item SHOULD deep-link to the relevant event or entity.

### Scenario: User disables push

Given `user_notification_preferences.push_enabled` is false or missing
When a push dispatcher processes a row for that user
Then Web Push MUST NOT be sent to that user.

