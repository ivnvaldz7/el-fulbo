# feat-012 — Sistema de notificaciones

## Objetivo

Implementar los 3 canales de notificación (Web Push, email, in-app badge) con la infraestructura técnica, la UI de suscripción, las preferencias del User y el digest diario/semanal.

---

## Referencias

- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §14 (Notificaciones).
- **Entidades:** `Notification`, `PushSubscription`.
- **Decisiones del engram:** `dec-033`, `dec-047`, `dec-048`, `dec-128` a `dec-133`.

---

## Alcance

### Incluye

- Suscripción a Web Push (VAPID) con onboarding opt-in.
- Almacenamiento de subscriptions en DB (`push_subscriptions`).
- Backend (Supabase Edge Function) para enviar pushes.
- Emails transaccionales vía Supabase SMTP.
- Digest diario por email al Admin con pendientes acumulados.
- Badge in-app con count de notificaciones no leídas.
- Feed de notificaciones accesible desde menú.
- Preferencias por usuario (on/off de push, digest, etc.).
- Marcado como leído.
- Push notifications con deep-link a la pantalla correspondiente.

### No incluye

- SMS.
- Notificaciones desktop nativas (solo vía PWA instalada).
- Integración con WhatsApp API oficial.
- Templates customizables por usuario.

---

## Arquitectura

### Tabla `push_subscriptions`

(Ya existe en `db-schema.md`.)

### Tabla `notifications`

(Ya existe en `db-schema.md`.)

### Edge Function `send-push`

Escucha inserts en `notifications` (trigger o cola pg_notify).

```ts
// supabase/functions/send-push/index.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:ivnvldz7@gmail.com',
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

async function sendPush(notification: Notification) {
  const subscriptions = await getPushSubscriptions(notification.user_id);

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, JSON.stringify({
        title: getTitle(notification),
        body: getBody(notification),
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: { url: getDeepLink(notification) },
      }));
      await updateLastUsed(sub.id);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription gone, archive
        await archiveSubscription(sub.id);
      }
    }
  }
}
```

### Service Worker

```ts
// public/sw.js
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const url = event.notification.data?.url || '/';
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
```

---

## Onboarding opt-in

**Momento de prompt:** no pedir permiso al signup (contraproducente). Esperar contexto útil:

- **Primer trigger:** cuando el Player confirma asistencia por primera vez a un evento.
  - Banner no intrusivo arriba de la pantalla de confirmación.
  - Copy: *"¿Te avisamos cuando arranque el partido?"*.
  - Botones: *"Sí, activar"* / *"Ahora no"*.
- **Segundo trigger:** cuando el Admin recibe su primera notificación in-app de stats pending.
  - Similar, copy adaptado: *"Te avisamos cuando haya cartas nuevas para aprobar."*.

**Si el User acepta:**
- Cliente pide permiso al browser (`Notification.requestPermission()`).
- Si el browser permite: suscribir y guardar en `push_subscriptions`.
- Toast: *"Listo, vamos a avisarte."*

**Si el User rechaza:**
- No preguntar de nuevo en esa sesión.
- Próximo trigger: 30 días después.

### Preferencias en settings del User

**Ruta:** `/settings/notifications`

**UI:**

- **Web Push:** toggle principal.
  - Si está ON y el browser tiene permiso revocado: mensaje *"El navegador está bloqueando las notifs. Habilitalas en la configuración del sitio."* + link a instrucciones.
- **Recordatorios de partidos:** toggle (afecta a los recordatorios 24h y 2h antes).
- **Digest por email:** toggle (si es Admin).
- **Frecuencia del digest:** selector *"Diario"* / *"Semanal"* / *"Desactivado"*.

---

## Digest diario/semanal

### Diario (para Admins)

**Cuándo:** cronjob diario a las 9 AM hora local del User (aproximada por timezone del navegador al último login).

**Contenido:**
- Summary de los últimos pendientes de las últimas 24h:
  - Cartas nuevas por aprobar.
  - Revisiones de stats.
  - Solicitudes de reintegro.
- Summary de eventos:
  - Partidos próximos (próximos 7 días).
  - Cambios en asistencia (si son relevantes).

**Si no hay nada nuevo:** no se envía email.

**Copy template:**

```
Hola {nombre},

Resumen de tu grupo {grupo} (ayer):

📋 Pendientes:
- Juan cargó sus stats (hace 1 día)
- Laura pidió revisión de sus stats (hace 1 día)

⚽ Próximo partido:
- Sábado 26, 20:00, La Boquita (F5)
  Confirmados: 8/10

Resolvé los pendientes cuando puedas:
{deep-link a /my-admin}

Buen partido,
El Fulbo
```

### Semanal (para todos los Players)

**Cuándo:** domingos 10 AM.

**Contenido:**
- Partidos de la semana (resultados + MVPs).
- Cambios en tu card (si hubo boost).
- Próximos partidos.

**Si el user no tuvo actividad:** no se envía.

**Preferencia:** opt-in. Default OFF. Solo se activa si el User lo habilita en settings.

---

## Badge in-app

**Ubicación:** ícono de campana en el header/navbar de la app.

**Comportamiento:**
- Muestra number badge con count de `notifications WHERE user_id=auth.uid() AND read_at IS NULL`.
- Tap → abre `/notifications`.

### Ruta `/notifications`

**UI:**
- Lista de notifications ordenadas por `created_at` desc.
- Cada item:
  - Ícono según tipo.
  - Texto principal (copy según tipo).
  - Timestamp relativo.
  - Si es no leída: dot rojo chico.
- Tap → ejecuta acción (deep-link a pantalla correspondiente) + marca como leída.
- Botón arriba *"Marcar todas como leídas"*.

---

## Deep-linking

Cada notification tiene un "destino" natural:

| Tipo | Deep-link |
|------|-----------|
| `event_created` | `/groups/{id}/events/{event_id}` |
| `event_rescheduled` | `/groups/{id}/events/{event_id}` |
| `event_cancelled` | `/groups/{id}/events/{event_id}` |
| `someone_dropped` | `/groups/{id}/events/{event_id}` |
| `stats_pending_approval` | `/groups/{id}/admin-tasks` |
| `stats_approved` | `/groups/{id}/players/{player_id}` |
| `stats_revision_requested` | `/groups/{id}/admin-tasks/revisions/{request_id}` |
| `stats_revision_resolved` | `/groups/{id}/players/{player_id}` |
| `stats_changed_log` | `/groups/{id}/feed` |
| `mvp_awarded` | `/groups/{id}/events/{event_id}` |
| `boost_applied` | `/groups/{id}/players/{player_id}` |
| `owner_assigned` | `/groups/{id}/dashboard` |
| `owner_temporary_assigned` | `/temporary-owner/{event_id}` |
| `reintegration_request` | `/groups/{id}/admin-tasks/reintegrations/{request_id}` |
| `reintegration_approved` | `/groups/{id}/dashboard` |
| `reintegration_rejected` | `/dashboard` |
| `player_returned` | `/groups/{id}/dashboard` |
| `match_ready` | `/groups/{id}/events/{event_id}/teams` |
| `weekly_digest` | `/groups` (dashboard general) |

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| User en iOS < 16.4 sin PWA instalada | Web Push no disponible. Solo email + in-app. |
| User desinstala la PWA | Subscription queda stale, próximo intento falla con 410, se archiva. |
| User revoca permisos en settings del browser | Próximo push falla silenciosamente. UI detecta y muestra warning en settings del User. |
| User activa push en múltiples devices | Cada device genera su propio subscription row. Cada push se envía a todos. |
| User bloquea email en su cliente | Los emails siguen enviándose pero no se leen. Sin consecuencia para el sistema. |
| Push delivery con network glitch | Retry hasta 3 veces con exponential backoff. |
| Admin en 2 devices recibe push + abre en uno | El otro device el push queda sin acción (usuario lo desestima o expira). |

---

## Validaciones

- User debe tener sesión para suscribirse.
- `subscription.endpoint` único: si ya existe, actualizar timestamp.

---

## Tests

### Unit
- Generación de deep-links según tipo.
- Template de digest con distintos niveles de contenido.

### Integration
- Insert en `notifications` dispara edge function → push enviado.
- Subscription 410 → archivo automático.
- Permisos revocados → warning en UI.

### E2E (opcional, dependiendo de infra de testing)
- User se suscribe, recibe push real en un device de prueba.

---

## Copy (mensajes de todas las notifications)

Ver referencias en cada feature anterior. Resumen general del centro de notifs:

- Toast activación: *"Listo, vamos a avisarte."*
- Título campana vacía: *"No tenés notificaciones"*
- Subtítulo: *"Acá te vamos a avisar de los partidos, aprobaciones y más."*
- Botón marcar todas: *"Marcar todas como leídas"*
- Banner pidiendo permiso: *"¿Te avisamos cuando arranque el partido?"* / *"Te avisamos cuando haya cartas nuevas para aprobar."*
- Botones del banner: *"Sí, activar"* / *"Ahora no"*
- Warning browser bloqueado: *"El navegador está bloqueando las notifs. Habilitalas en la configuración del sitio."*

---

## Criterios de aceptación

- [ ] VAPID keys configuradas en env vars.
- [ ] Service Worker registrado con handlers de push y click.
- [ ] Opt-in contextual en primera confirmación + primera notif in-app del admin.
- [ ] `push_subscriptions` persistidas correctamente.
- [ ] Edge Function `send-push` envía a todos los devices del User.
- [ ] Fallback graceful si endpoint está muerto.
- [ ] Digest diario funciona con cronjob a las 9 AM.
- [ ] Digest semanal opcional (opt-in).
- [ ] Badge in-app con count preciso.
- [ ] `/notifications` muestra feed con deep-links funcionales.
- [ ] Settings de preferencias guarda y persiste.
- [ ] Tests pasan.
