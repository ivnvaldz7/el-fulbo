# feat-011 — Gestionar owners

## Objetivo

Permitir al Admin designar Owners fijos (hasta 2) desde settings del grupo, y manejar el ciclo automático de Owners temporales cuando el Admin no puede hacer check-in (se fue de viaje, no confirmó asistencia, etc.).

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 12 (Designar Owner), §Flow 13 (Owner temporal automático).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §10 (Owners fijos), §11 (Owners temporales).
- **Entidades:** `GroupMembership`, `TemporaryOwner`, `Event`.
- **Decisiones del engram:** `dec-027`, `dec-122` a `dec-127`.

---

## Alcance

### Incluye

- UI en settings del grupo para designar/remover Owners fijos.
- Búsqueda por nombre entre Players del grupo.
- Cronjob automático para designar Owners temporales (trigger: <2h antes del partido).
- Notifications al Owner temporal designado (push + email).
- Flow de aceptación/rechazo del Owner temporal.
- Escalación automática al siguiente por antigüedad si rechaza o no confirma en 1h.
- Expiración automática 24h después del partido.

### No incluye

- Roles intermedios (solo Admin, Owner y Player).
- Permisos granulares (todos los owners tienen los mismos permisos).
- Votación comunitaria de Owners (no existe).

---

## Owners fijos

### UI en settings

**Ruta:** `/groups/{id}/settings/owners` (sub-sección de settings del grupo, solo Admin).

**UI:**

- Header: *"Owners"*.
- Subtítulo: *"Los owners pueden sortear, cargar resultados y elegir MVP. No editan stats."*
- Lista de Owners actuales (0-2):
  - Foto + nombre + fecha de designación.
  - Botón *"Remover"* al lado de cada uno.
- Si hay cupo (<2): sección *"Agregar owner"*:
  - Input search con autocomplete.
  - Filtra Players del grupo activos con `user_id` no null (no phantom).
  - Excluye al Admin (no puede ser owner de su propio grupo) y a los Owners ya designados.
  - Al seleccionar y confirmar: se designa.

### Acción "Designar owner"

**RPC:**

```sql
create or replace function assign_owner(
  p_group_id uuid,
  p_user_id uuid
) returns void language plpgsql security definer as $$
begin
  -- Validar admin
  if not is_group_admin(p_group_id) then
    raise exception 'FORBIDDEN';
  end if;

  -- Validar cupo (<2)
  if (select count(*) from group_memberships
      where group_id = p_group_id and role = 'owner') >= 2 then
    raise exception 'OWNER_CAP_REACHED';
  end if;

  -- Validar que el User es Player activo del Group (y no es el Admin)
  if not exists (
    select 1 from players
    where group_id = p_group_id and user_id = p_user_id
    and archived_at is null
  ) then
    raise exception 'NOT_FOUND: el usuario no es miembro activo';
  end if;

  if exists (
    select 1 from groups where id = p_group_id and admin_user_id = p_user_id
  ) then
    raise exception 'VALIDATION_ERROR: el admin no puede ser owner';
  end if;

  -- Crear membership
  insert into group_memberships (user_id, group_id, role, assigned_by_user_id)
  values (p_user_id, p_group_id, 'owner', auth.uid());

  -- Notificar al nuevo owner
  insert into notifications (user_id, type, payload)
  values (p_user_id, 'owner_assigned', jsonb_build_object(
    'group_id', p_group_id,
    'assigned_by', auth.uid()
  ));
end;
$$;
```

**Notification `owner_assigned`:** push + email + in-app. Copy: *"Ahora sos owner de {grupo}. Podés sortear y cargar resultados."*.

### Acción "Remover owner"

**RPC:**

```sql
create or replace function remove_owner(
  p_group_id uuid,
  p_user_id uuid
) returns void language plpgsql security definer as $$
begin
  if not is_group_admin(p_group_id) then
    raise exception 'FORBIDDEN';
  end if;

  delete from group_memberships
  where group_id = p_group_id and user_id = p_user_id and role = 'owner';

  -- Notificar al ex-owner
  insert into notifications (user_id, type, payload)
  values (p_user_id, 'owner_removed', jsonb_build_object('group_id', p_group_id));
end;
$$;
```

**Notification `owner_removed`:** in-app only. Copy: *"Ya no sos owner de {grupo}."*

---

## Owners temporales automáticos

### Trigger del cronjob

**Frecuencia:** cada 15 minutos.

**Query:**

```sql
select e.id, e.group_id, e.scheduled_at
from events e
join groups g on g.id = e.group_id
where e.status = 'scheduled'
and e.scheduled_at between now() + interval '1 hour' and now() + interval '2 hours'
-- Admin no confirmó asistencia
and not exists (
  select 1 from event_attendances ea
  join players p on p.id = ea.player_id
  where ea.event_id = e.id and p.user_id = g.admin_user_id and ea.status = 'going'
)
-- No hay Owner fijo con going
and not exists (
  select 1 from group_memberships gm
  join players p on p.user_id = gm.user_id and p.group_id = gm.group_id
  join event_attendances ea on ea.player_id = p.id and ea.event_id = e.id
  where gm.group_id = e.group_id and gm.role = 'owner' and ea.status = 'going'
)
-- Y aún no se designaron temporales
and not exists (
  select 1 from temporary_owners to_ where to_.event_id = e.id
)
```

Para cada Event que cumple, ejecutar `designate_temporary_owners(event_id)`.

### `designate_temporary_owners`

**Lógica:**

1. Obtener Players confirmados (`going`) en el Event.
2. Ordenar por antigüedad (`players.joined_at` ASC, más viejo primero).
3. Tomar los primeros 2 que tengan `user_id` no null (no fantasmas).
4. Por cada uno, crear row en `temporary_owners`:
   - `event_id`, `user_id`, `assigned_reason='admin_no_confirm_no_owners'`.
   - `confirmed_at=null`, `expires_at=event.scheduled_at + interval '24 hours'`.
5. Enviar notification `owner_temporary_assigned` (push + email + in-app) a cada uno:
   - Copy: *"Sos owner temporal del partido de hoy a las {hora}. ¿Confirmás?"*
   - CTA: *"Confirmar"*.

### UI de confirmación del Owner temporal

**Notification recibida → tap → pantalla:**

**Ruta:** `/temporary-owner/{event_id}`

**UI:**

- Título: *"Te designaron como owner temporal"*.
- Subtítulo: *"Del partido de {grupo} el {fecha} a las {hora}."*
- Explicación: *"Si aceptás, vas a poder hacer check-in, sortear, cargar resultado y elegir MVP. Tus poderes duran 24 horas después del partido."*
- 2 botones:
  - **"Acepto"** (verde, grande).
  - **"No puedo"** (gris, secundario).

### Acción "Acepto"

- `UPDATE temporary_owners SET confirmed_at = now()`.
- Notification al Admin (in-app): *"{nombre} aceptó ser owner temporal del partido."*.
- Redirect al Event.

### Acción "No puedo"

- `DELETE from temporary_owners WHERE event_id = X and user_id = auth.uid()`.
- **Escalación automática:** cronjob detecta que falta un temporal y designa al siguiente por antigüedad.
- Notification al siguiente candidato.
- Si se agotó la lista: notification urgente al Admin *"Nadie aceptó ser owner temporal. El partido está sin organizador."*.

### Escalación

Si pasan 1 hora sin que un Owner temporal confirme (confirmed_at sigue null):
- Cronjob dispara segundo intento: notificación de recordatorio.
- Si pasa otra hora sin confirmación: se considera "no responde", se elimina el temporary_owner, se pasa al siguiente en antigüedad.

### Expiración

**Cronjob cada hora:**

```sql
update temporary_owners
set confirmed_at = null  -- deactivate
where confirmed_at is not null and expires_at < now();
```

Después de 24h del partido, los permisos del Owner temporal se desactivan automáticamente. No se borra la row (se mantiene para auditoría).

---

## Notification types nuevos

| Tipo | Push | Email | In-app |
|------|------|-------|--------|
| `owner_assigned` | ✅ | ✅ | ✅ |
| `owner_removed` | ❌ | ❌ | ✅ |
| `owner_temporary_assigned` | ✅ | ✅ | ✅ |
| `owner_temporary_accepted` | ❌ | ❌ | ✅ (al Admin) |
| `owner_temporary_rejected` | ❌ | ❌ | ✅ (al Admin si aplicaba) |
| `owner_temporary_no_one_accepted` | ✅ | ✅ | ✅ (al Admin) |

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Admin quiere designar como Owner a un Player fantasma | UI no lo muestra en search (filtro `user_id is not null`). |
| Admin se designa a sí mismo como Owner | UI lo filtra. RPC adicional valida y rechaza. |
| Admin remueve al único Owner antes de un partido donde él no va | Cronjob puede disparar owners temporales al día siguiente. |
| Admin designa Owner y después transfiere el rol de Admin al mismo Owner | El owner existente se convierte en Admin. La membership vieja se actualiza (no se duplica). |
| Todos los Players confirmados son fantasmas (raro pero posible en check-in manual) | No hay candidatos humanos para owner temporal. Notification urgente al Admin. |
| Owner temporal acepta pero el partido se cancela | Los permisos siguen 24h. El Event cancelado no permite acciones igual. No tiene efecto negativo. |
| Owner temporal acepta y el Admin reaparece | Ambos tienen permisos durante las 24h. Sin conflicto. |
| Owner fijo era designado, se va del grupo | La group_membership se cascadea al eliminar el Player. El slot queda libre. |

---

## Validaciones

```ts
const assignOwnerSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});
```

---

## Tests

### Unit
- `assignOwner` happy path.
- Cupo lleno → `OWNER_CAP_REACHED`.
- Admin intenta designarse a sí mismo → `VALIDATION_ERROR`.
- User no miembro → `NOT_FOUND`.

### Integration
- Cronjob de designación temporal se ejecuta correctamente.
- Escalación al siguiente candidato si rechaza.
- Expiración post-24h desactiva permisos.
- Owner temporal puede hacer check-in y sortear (permisos validados en otros features).

### RLS
- Solo Admin puede ejecutar `assign_owner` / `remove_owner`.
- Owner temporal confirmado dentro de `expires_at` pasa el check `is_group_owner`.

---

## Copy

- Título settings: *"Owners"*
- Subtítulo: *"Los owners pueden sortear, cargar resultados y elegir MVP. No editan stats."*
- Botón agregar: *"Agregar owner"*
- Botón remover: *"Remover"*
- Notif owner_assigned: *"Ahora sos owner de {grupo}. Podés sortear y cargar resultados."*
- Notif owner_removed: *"Ya no sos owner de {grupo}."*
- Notif temporary asignado: *"Sos owner temporal del partido de hoy a las {hora}. ¿Confirmás?"*
- Página temporary asignado título: *"Te designaron como owner temporal"*
- Subtítulo: *"Del partido de {grupo} el {fecha} a las {hora}."*
- Explicación: *"Si aceptás, vas a poder hacer check-in, sortear, cargar resultado y elegir MVP. Tus poderes duran 24 horas después del partido."*
- Botones: *"Acepto"* / *"No puedo"*
- Notif al admin ninguno aceptó: *"Nadie aceptó ser owner temporal. El partido está sin organizador."*

---

## Criterios de aceptación

- [ ] Admin puede designar hasta 2 Owners desde settings.
- [ ] Admin no puede ser Owner.
- [ ] Players fantasma no son candidatos.
- [ ] Cronjob de 15 min detecta events sin admin+owners y designa temporales.
- [ ] Criterio: 2 más antiguos con `going`.
- [ ] Escalación automática si rechazan.
- [ ] Notification urgente al admin si nadie acepta.
- [ ] Expiración 24h post-partido.
- [ ] Permisos de owner temporal equivalentes a owner fijo.
- [ ] Tests pasan.
