# feat-006 — Confirmar asistencia

## Objetivo

Que cada Player pueda responder rápido si va al partido, usando la app como reemplazo directo de la encuesta de WhatsApp. Debe sentirse tan liviano como votar en una encuesta nativa: 1 tap y listo.

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 7 (Confirmar asistencia).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §8.2 (Fase de confirmación), §14 (Notificaciones).
- **Entidades:** `EventAttendance`, `Event`, `Player`.
- **Tipos:** `AttendanceStatus`, `UpdateAttendanceInput`.
- **Decisiones del engram:** `dec-096` a `dec-101`.

---

## Alcance

### Incluye

- UI de confirmación en la página del Event.
- Persistencia del estado: `going`, `not_going`, `maybe`.
- Cambios ilimitados de respuesta hasta check-in.
- Listado en vivo de confirmados, no-van y tal-vez.
- Notificación al Admin cuando alguien se baja a último momento.
- Umbral configurable para "último momento" (default: 6h antes del partido).
- Restricciones para Players con carta pending (no pueden confirmar hasta aprobación).

### No incluye

- Check-in físico (`feat-007`).
- Sorteo (`feat-007`).
- Comentarios sobre la asistencia ("voy pero me voy antes") — queda para v2.1 si hay demanda.
- Invitaciones a "jugadores adicionales" (eso lo cubre player fantasma, `feat-013`).

---

## Flujo

### Etapa 1 — El Player entra al Event

**Ruta:** `/groups/{id}/events/{event_id}`

**UI relevante para el Player:**

- Arriba, card con info del partido (fecha, hora, cancha, Maps, modalidad).
- Sección **"¿Vas?"** con 3 botones grandes:
  - **"Voy"** (verde)
  - **"No voy"** (gris)
  - **"Tal vez"** (amarillo)
- El botón actualmente seleccionado se ve resaltado (border destacado + check icon).
- Si el Player **nunca respondió**: ningún botón marcado, texto chico debajo: *"Tocá para confirmar."*
- Si el Player **tiene carta pending**: los 3 botones están deshabilitados con tooltip: *"Esperá que aprueben tu carta para confirmar."*

**Sección de lista (visible para todos los miembros):**

- 3 contadores visuales: *"Van: 8"*, *"No van: 2"*, *"Tal vez: 3"*.
- Cada contador es expandible (colapsado por default).
- Al expandir, muestra la lista de nombres con foto chica al lado, ordenada por antigüedad en el grupo.
- Players con `stats_status='pending_approval'` no aparecen acá hasta ser aprobados (consistente con dec-042).

### Etapa 2 — Tocar un botón

**Comportamiento:**

1. Tap en "Voy" (o cualquiera).
2. UI: cambio visual inmediato (optimistic update). Botón seleccionado se resalta.
3. RPC `update_attendance(event_id, status)`.
4. Si el RPC falla: revertir UI + toast *"No pudimos guardar tu respuesta, reintentá."*.
5. Si el RPC sucede: contador correspondiente se actualiza en la lista.

**RPC:**

```sql
create or replace function update_attendance(
  p_event_id uuid,
  p_status attendance_status
) returns void language plpgsql security definer as $$
declare
  target_event public.events%rowtype;
  target_player public.players%rowtype;
  old_status attendance_status;
  hours_to_event numeric;
begin
  -- Fetch event
  select * into target_event from public.events where id = p_event_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  -- Check status del evento
  if target_event.status not in ('scheduled', 'confirming') then
    raise exception 'CONFLICT: el partido ya arrancó o terminó';
  end if;

  -- Fetch player del user autenticado en este grupo
  select * into target_player from public.players
  where group_id = target_event.group_id
  and user_id = auth.uid()
  and archived_at is null;
  if not found then raise exception 'FORBIDDEN'; end if;

  -- Bloquear si carta pending
  if target_player.stats_status = 'pending_approval' then
    raise exception 'STATS_PENDING_APPROVAL';
  end if;

  -- Fetch status anterior para ver si hay que notificar al admin
  select status into old_status from public.event_attendances
  where event_id = p_event_id and player_id = target_player.id;

  -- Upsert
  insert into public.event_attendances (event_id, player_id, status)
  values (p_event_id, target_player.id, p_status)
  on conflict (event_id, player_id) do update
    set status = p_status, updated_at = now();

  -- Si el Player se bajó (going → not_going o maybe → not_going) y el partido es en < 6h, notificar al admin
  hours_to_event := extract(epoch from (target_event.scheduled_at - now())) / 3600;
  if old_status in ('going', 'maybe') and p_status = 'not_going' and hours_to_event < 6 then
    insert into public.notifications (user_id, type, payload)
    select
      g.admin_user_id,
      'someone_dropped',
      jsonb_build_object(
        'event_id', p_event_id,
        'player_id', target_player.id,
        'player_name', target_player.display_name,
        'hours_to_event', hours_to_event
      )
    from public.groups g
    where g.id = target_event.group_id;
  end if;
end;
$$;
```

### Etapa 3 — Cambios ilimitados

El Player puede cambiar su respuesta cuantas veces quiera mientras el Event esté en `scheduled` o `confirming`. Cada cambio genera un upsert.

**Una vez que el Event pasa a `checked_in`:**
- Los botones se deshabilitan con mensaje: *"El partido ya arrancó el check-in. No podés cambiar tu respuesta."*.
- La respuesta final se congela.

### Etapa 4 — Notificación al admin cuando alguien se baja

**Trigger:** Player con status `going` o `maybe` cambia a `not_going` cuando faltan menos de 6h para el partido.

**Notification `someone_dropped`:**
- Push al admin.
- In-app al admin.
- Copy: *"{nombre} se bajó del partido de hoy."*

**Si el partido es a más de 6h, no se notifica** al admin por baja. El admin puede ver la lista cuando quiera.

---

## Lista de asistencia en vivo

**Uso de Supabase Realtime** para actualizar la UI sin refresh.

- Cuando un Player responde, el contador y la lista se actualizan para todos los que tienen el Event abierto.
- Implementación: subscripción a cambios en `event_attendances` filtrado por `event_id`.

**Orden de nombres en cada lista:**
- Por antigüedad de membresía en el Group (el más viejo arriba).
- Si 2 tienen antigüedad similar (minutos de diferencia): ordenar por nombre alfabético.

---

## Recordatorios (opcional)

**Antes del partido**, el sistema envía notifications automáticas:

- **24h antes**: a los que tienen `status='maybe'` o no respondieron todavía.
  - Copy: *"Mañana hay partido. ¿Vas?"*
- **2h antes**: a los que tienen `status='going'` como recordatorio.
  - Copy: *"En 2hs empieza el partido."*

**Implementación:** cronjob cada 15 min que revisa eventos próximos y dispara notifications correspondientes.

**Nota:** estos recordatorios respetan las preferencias de notificación del User (dec-033 / feat-012).

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Player con carta pending intenta confirmar | Botones deshabilitados con tooltip. |
| Player confirma "voy", después cambia a "no voy" con 1h antes | Admin recibe notification `someone_dropped` con urgencia. |
| Player confirma "tal vez" y nunca cambia | Aparece en lista "Tal vez" hasta check-in. El Admin puede incluirlo o no al hacer check-in. |
| Player confirma "voy" pero no aparece a la cancha | No tiene check-in, no entra al sorteo. Histórico: queda como "no asistió" implícito. |
| Admin modifica la fecha del evento | Todas las `event_attendances` se conservan. Los Players que habían confirmado siguen confirmados pero reciben notif de cambio de fecha. |
| Admin cancela el evento | Las `event_attendances` se conservan para histórico. El evento queda en `status='cancelled'`, los botones se deshabilitan. |
| Dos Players hacen tap en "Voy" al mismo tiempo (race) | Upserts son atómicos, ambos se procesan sin conflicto. |
| Player con mala conexión: tap, loader, red se cae | UI revierte + toast de error. Player reintenta. |

---

## Contratos

```ts
interface UpdateAttendanceInput {
  eventId: EventId;
  status: AttendanceStatus;
}

type UpdateAttendanceOutput = Result<void, AppError>;
```

---

## Validaciones

```ts
const updateAttendanceSchema = z.object({
  eventId: z.string().uuid(),
  status: z.enum(['going', 'not_going', 'maybe']),
});
```

---

## Tests

### Unit
- `updateAttendance` happy path.
- Status `pending_approval` → `STATS_PENDING_APPROVAL`.
- Event en `played` → `CONFLICT`.
- Bajada a 5h antes → notifica al admin.
- Bajada a 7h antes → NO notifica.

### Integration
- Realtime actualiza la UI de otros Players conectados al mismo Event.
- Cambios múltiples del mismo Player se sobrescriben correctamente.

### RLS
- Solo miembros del Group pueden hacer `update_attendance` para events del Group.
- Un Player NO puede actualizar la asistencia de otro Player.

---

## Copy

- Sección título: *"¿Vas?"*
- Botones: *"Voy"*, *"No voy"*, *"Tal vez"*
- Placeholder sin respuesta: *"Tocá para confirmar."*
- Tooltip pending: *"Esperá que aprueben tu carta para confirmar."*
- Contadores: *"Van: X"*, *"No van: X"*, *"Tal vez: X"*
- Mensaje post-check-in: *"El partido ya arrancó el check-in. No podés cambiar tu respuesta."*
- Notif al admin: *"{nombre} se bajó del partido de hoy."*
- Recordatorio 24h: *"Mañana hay partido. ¿Vas?"*
- Recordatorio 2h: *"En 2hs empieza el partido."*
- Toast error: *"No pudimos guardar tu respuesta, reintentá."*

---

## Criterios de aceptación

- [ ] 3 botones de asistencia visibles para Players con carta aprobada.
- [ ] Deshabilitados para Players con carta pending.
- [ ] Cambios ilimitados hasta check-in.
- [ ] UI optimistic + revert si falla.
- [ ] Realtime sync para todos los conectados.
- [ ] Notif `someone_dropped` dispara con <6h y no antes.
- [ ] Recordatorios 24h y 2h implementados via cronjob.
- [ ] Tests pasan.
