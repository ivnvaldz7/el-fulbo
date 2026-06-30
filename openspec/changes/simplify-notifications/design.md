# Design: Simplify Notifications

## Technical Approach

Refactor por capas: DB cleanup → dead code → crons → inline push → shareable links → overlays. Cada fase es autónoma y testeable. No se crean nuevas abstracciones ni servicios genéricos.

## Architecture Decisions

### Decision: Overlay via URL params en lugar de router separado

**Choice**: `?confirmar=<eventId>` y `?votar-mvp=<eventId>` en la URL del evento
**Alternatives considered**: Páginas independientes (`/confirmar/[id]`), modales globales en layout
**Rationale**: El overlay es contextual al evento. Usar params evita crear rutas nuevas y simplifica la auth (el middleware existente redirige a login preservando query params). El componente se monta en la page del evento.

### Decision: Push inline en closeMvpVoting

**Choice**: Llamar `sendPushToUser()` desde el service de TypeScript después del RPC
**Alternatives considered**: Edge Function con trigger DB, el RPC mismo hace push
**Rationale**: No podemos hacer push desde SQL. Edge Function requiere infra separada. La llamada inline desde TypeScript es directa: RPC → leer winner → `sendPushToUser()`.

### Decision: Cron único de mantenimiento

**Choice**: `/api/jobs/maintenance` unifica create-recurring-events + event-transitions + reminder push
**Rationale**: Todos son jobs diarios que usan service role. Vercel Hobby permite 1 ejecución/día por cron. Unificando reducimos de 6 a 3 crons (maintenance + temporary-owners + archive-phantoms).

## Data Flow

### Flujo: Shareable link de confirmación

```
Admin ve evento en estado 'confirming'
  → Botón "Compartir" → copia URL con ?confirmar=<id>
  → Lo pega en WhatsApp
  → Player abre link
  → Auth middleware (redirect si no logueado)
  → Event page detecta ?confirmar=xxx
  → AttendanceConfirmationOverlay se monta
  → Player elige "Voy/No voy/Tal vez"
  → Llamada a update_attendance RPC
  → Overlay se cierra, toast de éxito
```

### Flujo: Shareable link de votación MVP

```
Admin carga resultado (load_match_result RPC)
  → Botón "Compartir votación MVP" → copia URL con ?votar-mvp=<id>
  → Player abre link
  → Mismo flujo de auth
  → MvpVotingOverlay se monta
  → Player elige a quién votar
  → Llamada a submit_mvp_vote RPC
  → Overlay se cierra
```

### Flujo: Recordatorio push 24h antes

```
Maintenance cron (5am UTC)
  → Query events WHERE status='confirming'
    AND scheduled_at BETWEEN now AND now+24h
  → Por cada evento:
    → Query approved players del grupo
    → Query event_attendances de esos players
    → Filtrar los que NO tienen status='going'
    → sendPushToUser() con payload recordatorio
```

### Flujo: Push MVP al ganador

```
Admin cierra votación (closeMvpVoting en service)
  → RPC close_mvp_voting (crea notifs mvp_awarded + boost_applied)
  → Service lee evento actualizado (mvp_player_id)
  → Service lee user_id del player ganador
  → sendPushToUser() con "¡Sos el MVP!"
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/notifications/notification-badge.tsx` | Delete | Dead code |
| `src/lib/notifications.ts` | Delete | Toast legacy |
| `src/app/api/jobs/push-delivery/route.ts` | Delete | Push pasa a inline |
| `src/app/api/jobs/daily-digest/route.ts` | Delete | No requerido |
| `src/app/api/jobs/weekly-digest/route.ts` | Delete | No requerido |
| `src/app/api/jobs/event-transitions/route.ts` | Delete | Mergeado a maintenance |
| `src/app/api/jobs/create-recurring-events/route.ts` | Delete | Mergeado a maintenance |
| `src/app/api/jobs/maintenance/route.ts` | Create | Cron unificado |
| `src/components/events/attendance-confirmation-overlay.tsx` | Create | Overlay confirmación |
| `src/components/events/mvp-voting-overlay.tsx` | Create | Overlay votación MVP |
| `src/app/groups/[id]/events/[event_id]/page.tsx` | Modify | Detectar URL params, montar overlays, share buttons |
| `src/app/groups/[id]/events/[event_id]/result/page.tsx` | Modify | Share button para votación MVP |
| `src/lib/services/events.service.ts` | Modify | closeMvpVoting → agregar push inline |
| `src/lib/services/notifications.service.ts` | Modify | Remove getPendingPushNotifications, markNotificationPushed |
| `src/lib/services/push-subscription.service.ts` | Modify | Remove archiveStaleSubscription, touchSubscription |
| `src/lib/services/push-sender.service.ts` | Modify | Keep sendPushToUser (inline), remove deliverPendingPushes |
| `src/lib/services/create-event-from-schedule.ts` | Modify | Move cron logic to maintenance |
| `src/lib/notifications-deeplink.ts` | Modify | Reduce NotificationType union |
| `supabase/migrations/XXXXX_simplify_notifications_cleanup.sql` | Create | Drop emailed_at, archived, last_used_at; simplify user_notification_preferences |
| `supabase/migrations/XXXXX_simplify_load_match_result.sql` | Create | Remove mvp_voting_open from load_match_result RPC |
| `vercel.json` | Modify | 6→3 crons |
| `tests/` | Modify | Update tests for changed services |

## Interfaces / Contracts

### AttendanceConfirmationOverlay props

```typescript
interface AttendanceConfirmationOverlayProps {
  eventId: string;
  groupId: string;
  onClose: () => void;
}
```

### MvpVotingOverlay props

```typescript
interface MvpVotingOverlayProps {
  eventId: string;
  groupId: string;
  onClose: () => void;
}
```

### Maintenance cron result

```typescript
interface MaintenanceResult {
  eventsCreated: number;
  eventsTransitioned: number;
  remindersSent: number;
  errors: string[];
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | closeMvpVoting push inline | Mock sendPushToUser / read event after RPC |
| Unit | URL param parsing (overlay trigger) | Smoke test component rendering |
| Unit | Maintenance cron logic | Test query building (not actual execution) |
| Integration | RPCs unchanged | Existing tests should still pass |
| E2E | Shareable link flow | Playwright: navigate with ?confirmar param |

## Migration / Rollout

No migration required beyond SQL migrations que:
1. `DROP COLUMN emailed_at FROM notifications`
2. `DROP COLUMN archived, last_used_at FROM push_subscriptions`
3. Simplify `user_notification_preferences` (dropar columnas, recrear tabla simplificada)
4. Reemplazar `load_match_result` RPC (quitar `mvp_voting_open`)

## Open Questions

- [x] ¿Qué pasa con notificaciones existentes en DB con tipos que eliminamos? → Se muestran igual, el enum en PostgreSQL no se modifica (solo limpiamos TypeScript)
- [x] ¿Mantenemos reacted-hot-toast? → Sí, solo removemos el wrapper `notifications.ts`, los toasts directos están bien
