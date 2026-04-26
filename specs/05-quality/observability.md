# Observability V2

Cómo vemos qué pasa en producción sin ser invasivos con la privacidad del usuario.

---

## Principios

1. **No hay analytics de terceros** (Google Analytics, Posthog, Mixpanel, etc.).
2. **Logs y errores únicamente.** Nada de tracking de comportamiento.
3. **Métricas agregadas**, no por User.
4. **Privacy-first:** emails, nombres, stats nunca se loggean.

---

## Stack

- **Sentry** para errores de cliente (Next.js) y server (Supabase Edge Functions).
- **Supabase Dashboard** para métricas de DB (queries lentas, RLS denies).
- **Vercel Analytics** (integrado, opt-in): métricas básicas de performance (LCP, FID, CLS).
- **Logs estructurados** en Edge Functions con Logflare.

---

## Qué se loguea

### Errores (Sentry)

Siempre:
- Stack trace.
- Ruta (página o API endpoint).
- User ID (sin email ni nombre).
- Group ID si aplica.
- Error code y message.

Nunca:
- Email del User.
- Stats.
- Display name.
- Contenido de mensajes (messages de revisiones, etc.).

### Eventos de dominio (Logflare)

Eventos estructurados que nos sirven para debugging:

```json
{
  "event": "match_result_loaded",
  "group_id": "uuid",
  "event_id": "uuid",
  "applied_boosts_count": 5,
  "duration_ms": 230,
  "timestamp": "2026-04-21T22:15:00Z"
}
```

Lista de eventos:
- `group_created`
- `player_joined`
- `stats_pending_created`
- `stats_approved`
- `stats_revision_requested`
- `stats_revision_resolved`
- `event_created`
- `attendance_changed`
- `checkin_completed`
- `draw_executed`
- `match_result_loaded`
- `boost_applied`
- `temporary_owner_assigned`
- `temporary_owner_confirmed`
- `temporary_owner_rejected`
- `phantom_player_created`
- `phantom_player_resolved`
- `notification_sent` (con canal: push | email)
- `push_subscription_failed`

### Métricas de DB

Supabase Dashboard automático:
- Queries lentas (> 500ms).
- RLS policy denies.
- Row count por tabla.
- Connection count.

---

## Dashboards

### Dashboard "Salud del producto"
Métricas semanales:
- Groups activos (al menos 1 evento en los últimos 30 días).
- Events por semana.
- Tasa de confirmación promedio por evento.
- Tasa de "alguien se bajó a último momento".
- Tiempo desde creación del evento hasta primer confirmado.
- Ratio de Players con stats aprobadas vs pending.

### Dashboard "Fricción"
- Errores `STATS_PENDING_APPROVAL` (indica que hay stats esperando al admin).
- Temporary Owners rechazados → número.
- Phantom players no resueltos en los primeros 3 días.
- Draws con warnings `imbalance`.

---

## Alertas

### P0 (responder ASAP)
- Error rate > 5% en endpoints críticos (auth, create event, load result).
- DB connection pool > 80%.
- Supabase outage.

### P1 (responder en 24h)
- Error rate entre 2% y 5%.
- Queries lentas persistentes (> 1s).

### P2 (semanal)
- Push notifications con failure rate > 10%.
- Emails bouncing.

---

## Privacidad del usuario

- **Consentimiento push:** solo push después de permiso explícito.
- **Emails en logs:** nunca. Usamos `user_id` para correlacionar.
- **Retention de logs:** 90 días en Sentry, 30 días en Logflare.
- **Derecho al olvido:** cuando un User elimina cuenta, purgamos sus logs de Sentry/Logflare vía API.
- **Export:** el usuario puede pedir sus datos (via `/specs/03-features/feat-014-export-data`).

---

## KPIs del MVP (§10 de _v2-vision.md)

Medidos a los 30 días post-launch con 3 grupos de prueba:

1. Al menos 2 de 3 grupos dejaron de usar encuestas de WhatsApp.
   - **Cómo medir:** encuesta manual al organizador + ver frecuencia de eventos creados.
2. Organizador reporta menos tiempo.
   - **Cómo medir:** entrevista mensual.
3. Jugadores abren la app ≥ 1x por semana.
   - **Cómo medir:** `session_started` contado por `user_id` en Logflare.
4. Al menos 1 card compartida por partido.
   - **Cómo medir:** evento `card_shared` al usar Web Share API.

Si no se cumplen 3 de 4 → pivotear (ver _v2-vision.md §10).
