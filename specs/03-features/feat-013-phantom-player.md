# feat-013 — Player fantasma

## Objetivo

Permitir al Admin u Owner crear un "player fantasma" durante el check-in para completar un equipo cuando falta alguien en el momento (un invitado llega sin cuenta, un amigo del amigo). Post-partido, el Admin decide qué hacer con él (convertirlo en real, archivar, eliminar).

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 9 (Player fantasma).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §9 (Player fantasma).
- **Entidades:** `Player.is_phantom`, `Player.user_id` (null en fantasmas).
- **Decisiones del engram:** `dec-028`, `dec-134` a `dec-137`.

---

## Alcance

### Incluye

- Creación de player fantasma desde check-in (feat-007).
- Form mínimo: solo nombre.
- Default stats: 6/6/6/6/6/6, posición MED.
- `stats_status='approved'` directo (el admin lo creó, no requiere aprobación posterior).
- Flag `is_phantom=true` para identificación.
- UI distintiva en lista de players (badge "FANTASMA").
- Resolución post-partido (7 días de ventana):
  - Convertir en real (magic link al email).
  - Archivar.
  - Eliminar.
- Cronjob de archive automático a los 7 días si no se decidió.

### No incluye

- Creación de fantasma fuera de check-in (fuera de MVP).
- Stats custom al crear (simplemente 6/6/6/6/6/6 default).
- Múltiples fantasmas con el mismo nombre: permitido, no se bloquea.

---

## Flujo

### Etapa 1 — Crear durante check-in

**Desde `/groups/{id}/events/{event_id}/check-in`:**

- Botón "Agregar jugador fantasma" → abre modal.

**Modal:**

- Título: *"Agregar jugador fantasma"*
- Input: *"Nombre"* (1-40 chars).
- Placeholder: `Ej: Juan, Juan Gómez`.
- Tooltip/explicación chica: *"Creamos una ficha temporal para completar el equipo. Después del partido decidís qué hacer con ella."*
- Selector de posición primaria (opcional):
  - Default: MED.
  - Opciones: ARQ, DEF, MED, DEL.
  - Motivo: si sabés que es arquero, marcarlo ARQ desde el inicio ayuda al balanceo.
- Botón: *"Agregar"* / Botón secundario: *"Cancelar"*.

**Al confirmar:**

1. RPC `create_phantom_player(group_id, event_id, name, primary_position)`.
2. Crea Player con:
   - `user_id=null`, `group_id`, `display_name=name`.
   - `primary_position=MED` (o la elegida), `secondary_position=null`.
   - `stats_status='approved'`, `is_phantom=true`.
   - Stats default según posición:
     - Campo: `{pac:6, sho:6, pas:6, dri:6, def:6, phy:6}`.
     - Arquero: `{div:6, han:6, kic:6, ref:6, spd:6, pos:6}`.
   - `current_boost=null`.
3. Crea `event_attendance` con `status='going'`, `checked_in=true`.
4. Retorna `player_id`.
5. Frontend: el nuevo Player aparece en la lista de check-in con badge "FANTASMA" y ya marcado como checked_in.

**RPC:**

```sql
create or replace function create_phantom_player(
  p_group_id uuid,
  p_event_id uuid,
  p_name text,
  p_primary_position player_position default 'MED'
) returns uuid language plpgsql security definer as $$
declare
  new_player_id uuid;
  default_stats jsonb;
begin
  -- Validar permisos (admin u owner del grupo)
  if not (is_group_admin(p_group_id) or is_group_owner(p_group_id)) then
    raise exception 'FORBIDDEN';
  end if;

  -- Validar cupo (50 players)
  if (select count(*) from players
      where group_id = p_group_id and archived_at is null) >= 50 then
    raise exception 'PLAYER_GROUP_LIMIT_REACHED';
  end if;

  -- Stats default según posición
  if p_primary_position = 'ARQ' then
    default_stats := '{"div":6,"han":6,"kic":6,"ref":6,"spd":6,"pos":6}'::jsonb;
  else
    default_stats := '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb;
  end if;

  -- Insert player
  insert into players (
    user_id, group_id, display_name, primary_position,
    stats_status, stats, is_phantom
  ) values (
    null, p_group_id, trim(p_name), p_primary_position,
    'approved', default_stats, true
  ) returning id into new_player_id;

  -- Check-in automático en el event
  insert into event_attendances (event_id, player_id, status, checked_in, checked_in_at)
  values (p_event_id, new_player_id, 'going', true, now());

  return new_player_id;
end;
$$;
```

### Etapa 2 — Durante el partido

- El fantasma juega normalmente.
- Aparece en el sorteo con sus 6/6/6/6/6/6 (overall ~55-60 según posición).
- Participa en MatchParticipation como cualquier otro player.
- Si es elegido MVP, recibe boost normalmente (se guarda en su `current_boost`).

### Etapa 3 — Post-partido (ventana de 7 días)

**Banner en el dashboard del Admin:**

Si hay fantasmas sin resolver:
- Widget en el dashboard del grupo: *"Jugador fantasma pendiente: {nombre}"* con botones inline:
  - *"Convertir en real"* → abre flow.
  - *"Archivar"* → confirma y archiva.
  - *"Eliminar"* → confirmación doble, hard delete.

**Alternativa:** sección en `/groups/{id}/admin-tasks` con los fantasmas pendientes (aparece como 4ta sección si hay >0).

### Etapa 4a — Convertir fantasma en real

**UI:**
- Modal: *"Convertir a {nombre} en jugador real"*.
- Input: email del jugador.
- Botón: *"Enviar invitación"*.

**RPC `convert_phantom_to_real(player_id, email)`:**

```sql
-- 1. Validar que player es phantom y pertenece al grupo del admin
-- 2. Generar magic link token (24h de vida)
-- 3. Enviar email con link: /convert-phantom/{token}
-- 4. No se modifica el player todavía (queda phantom hasta que acepte)
```

**El receptor del email:**
- Tap en link → llega a El Fulbo.
- Si no tiene cuenta: Google OAuth primero.
- Pantalla: *"¡Te convirtieron en jugador real de {grupo}!"* + preview de la card fantasma + botón *"Aceptar"*.
- Al aceptar:
  - `UPDATE players SET user_id=auth.uid(), is_phantom=false, joined_at=now()`.
  - El histórico de partidos se mantiene.
  - Notification al admin: *"{email} aceptó la invitación y ahora es jugador real."*.

**Si no acepta en 7 días (token expira):**
- El player sigue siendo phantom. El admin puede re-enviar invitación.

### Etapa 4b — Archivar fantasma

- RPC simple: `UPDATE players SET archived_at=now() WHERE id=player_id`.
- Histórico se mantiene. No vuelve automáticamente.

### Etapa 4c — Eliminar fantasma

- Requiere confirmación doble (botón → modal "¿Seguro?" → botón "Sí, eliminar").
- RPC: hard delete del player.
- MatchParticipations asociadas quedan huérfanas (se conservan con `player_id` que ya no existe, para no perder histórico del event).

### Etapa 5 — Cronjob de auto-archive

Diariamente a las 5 AM:

```sql
update players
set archived_at = now()
where is_phantom = true
and archived_at is null
and joined_at < now() - interval '7 days'
-- Solo los que no están en events futuros
and not exists (
  select 1 from event_attendances ea
  join events e on e.id = ea.event_id
  where ea.player_id = players.id and e.scheduled_at > now()
);
```

Si el fantasma sigue en events futuros: no se archiva todavía.

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Admin crea 2 fantasmas con mismo nombre | Permitido. Se diferencian por ID interno. |
| Fantasma elegido MVP | Recibe boost. Si después se convierte en real, mantiene su boost. |
| Admin intenta convertir pero el email ya tiene cuenta de El Fulbo | El flow funciona igual: el User existente acepta la invitación. |
| Email inválido al convertir | Validación pre-envío. Error inline. |
| Fantasma creado por Owner, Admin quiere decidir resolución | Permitido. El Admin tiene todos los poderes post-evento. |
| Fantasma en event cancelado | Sus participations no cuentan para nada. Si se resuelve post-cancel, sigue el mismo flow. |
| Admin crea 5 fantasmas en el mismo check-in | Permitido (siempre que haya cupo de 50). |
| Fantasma se queda 7 días sin decisión | Cronjob archive. Admin puede des-archivarlo después (feature adicional o manual). |

---

## Validaciones

```ts
const createPhantomSchema = z.object({
  groupId: z.string().uuid(),
  eventId: z.string().uuid(),
  name: z.string().trim().min(1).max(40),
  primaryPosition: z.enum(['ARQ', 'DEF', 'MED', 'DEL']).default('MED'),
});

const convertPhantomSchema = z.object({
  playerId: z.string().uuid(),
  email: z.string().email(),
});
```

---

## Tests

### Unit
- Creación con position MED por default.
- Stats según posición (arquero vs campo).
- Auto check-in en el event.

### Integration
- Flow completo: crear → jugar → convertir → aceptar.
- Cronjob archive a los 7 días funciona.
- MatchParticipations huérfanas post-hard-delete se conservan.

---

## Copy

- Botón check-in: *"Agregar jugador fantasma"*
- Modal título: *"Agregar jugador fantasma"*
- Input label: *"Nombre"*, placeholder: `Ej: Juan, Juan Gómez`
- Explicación: *"Creamos una ficha temporal para completar el equipo. Después del partido decidís qué hacer con ella."*
- Selector posición: *"Posición (opcional)"*
- Botones: *"Agregar"* / *"Cancelar"*
- Badge en lista: *"FANTASMA"*
- Widget dashboard: *"Jugador fantasma pendiente: {nombre}"*
- Botones widget: *"Convertir en real"* / *"Archivar"* / *"Eliminar"*
- Modal convertir título: *"Convertir a {nombre} en jugador real"*
- Input email: *"Email"*, placeholder: `nombre@email.com`
- Botón convertir: *"Enviar invitación"*
- Email recibido título: *"¡Te convirtieron en jugador real de {grupo}!"*
- Botón aceptar: *"Aceptar"*
- Notif admin al aceptar: *"{email} aceptó la invitación y ahora es jugador real."*

---

## Criterios de aceptación

- [ ] Admin u Owner puede crear fantasma durante check-in.
- [ ] Stats default 6/6/6/6/6/6 según posición.
- [ ] Auto check-in en el event.
- [ ] Fantasma aparece en lista con badge "FANTASMA".
- [ ] Participa en sorteo y resultado como cualquier otro player.
- [ ] 7 días de ventana post-partido para decidir.
- [ ] Convertir envía email con magic link.
- [ ] Al aceptar, player deja de ser phantom pero mantiene histórico.
- [ ] Archivar y eliminar funcionan con confirmación.
- [ ] Cronjob auto-archive a los 7 días.
- [ ] Tests pasan.
