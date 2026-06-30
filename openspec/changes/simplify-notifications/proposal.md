# Proposal: simplify-notifications

## Intent

El sistema de notificaciones tiene sobreingeniería: 6 crons (incompatibles con Vercel Hobby que limita a 1/día), 29 tipos de notificación de los cuales solo 10 se usan, dead code (`NotificationBadge`, `getPendingPushNotifications`), y lógica anticipatoria para features no especificadas. Se simplifica para responder solo a los 4 casos de uso reales.

## Scope

### In Scope
- Dead code removal (componentes, funciones, archivos)
- DB cleanup: `emailed_at`, digest fields, `match_reminders`, `timezone`, `archived`, `last_used_at`
- Unificar 4 crons de notificaciones en 1 `/api/jobs/maintenance` diario
- Reemplazar `attendance_reminder` y `mvp_voting_open` por shareable links con overlay modal
- Push inline (eliminar push-delivery cron poll)
- Recordatorio push a no confirmados 24h antes (en maintenance cron)
- Push MVP al ganador (inline en `closeMvpVoting`)
- Limpiar `NotificationType` union a solo los 7 tipos que realmente se insertan

### Out of Scope
- Sistema de digests (no está en casos de uso)
- Crons no-notificaciones (temporary-owners, archive-phantoms)
- Página `/notifications` y hooks existentes (siguen funcionando)
- RPCs SQL existentes (excepto `load_match_result` para remover `mvp_voting_open`)

## Capabilities

### New Capabilities
- `attendance-shareable-link`: Link que abre overlay de confirmación
- `mvp-shareable-link`: Link que abre overlay de votación MVP

### Modified Capabilities
- `feat-012-notifications`: Reemplazar notifs por shareable links + push inline

## Approach

1. **Dead code** — eliminar `NotificationBadge`, `notifications.ts`, `getPendingPushNotifications`, `archiveStaleSubscription`, `touchSubscription`
2. **DB migrations** — simplificar `user_notification_preferences` (solo `push_enabled`), remover `emailed_at`, `archived`, `last_used_at`
3. **Crons** — mergear `event-transitions` + `create-recurring-events` en `/api/jobs/maintenance`. Eliminar `push-delivery`, `daily-digest`, `weekly-digest`
4. **Push inline** — `sendPushToUser()` inmediato al crear notificación. Eliminar columna `pushed_at`
5. **Shareable links** — URL params `?confirmar=<id>` y `?votar-mvp=<id>` disparan overlay modal. Admin tiene botón "Copiar link"
6. **Recordatorio** — en maintenance cron: eventos con `scheduled_at` entre 0-24h, push a quienes no tienen status `going`
7. **Push MVP** — después de `close_mvp_voting` exitoso, `sendPushToUser()` al ganador
8. **TypeScript cleanup** — reducir `NotificationType` a: `event_created`, `event_rescheduled`, `event_updated`, `event_cancelled`, `boost_applied`, `mvp_awarded`, `match_result_loaded`

## Affected Areas

| Area | Impact |
|---|---|
| `notification-badge.tsx`, `notifications.ts` | Removed |
| `push-delivery`, `daily-digest`, `weekly-digest`, `event-transitions`, `create-recurring-events` routes | Removed |
| `/api/jobs/maintenance/route.ts` | New |
| `notifications.service.ts`, `push-subscription.service.ts`, `push-sender.service.ts` | Modified |
| `notifications-deeplink.ts` | Modified (reduce types) |
| `src/components/events/` | New (overlays) |
| Event page / Result page | Modified (share buttons) |
| `vercel.json` | Modified (6→3 crons) |
| `supabase/migrations/` | New (2-3 migrations) |
| `close_mvp_voting` in service | Modified (add push) |

## Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Push inline puede rate-limitear | web-push library maneja errores, loguear y seguir |
| Shareable link sin auth no funciona | Middleware redirect con return URL |
| DB migration conflictiva | Migraciones separadas y reversibles |

## Rollback Plan

`git revert` commits por fase. Migraciones DB con down-sql. Rama feat/simplify-notifications hasta validación.

## Success Criteria

- [ ] `tsc --noEmit` pasa
- [ ] `vitest run --dir src` pasa
- [ ] Admin puede copiar link de confirmación → overlay funciona
- [ ] Admin puede copiar link de votación MVP → overlay funciona
- [ ] Push recordatorio llega solo a no confirmados
- [ ] Push MVP llega al ganador cuando admin cierra votación
- [ ] `vercel.json` tiene solo 3 crons
- [ ] No hay dead code ni tipos de notificación no usados
