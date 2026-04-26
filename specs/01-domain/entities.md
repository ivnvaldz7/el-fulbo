# Entities V2

Modelo de datos lógico del dominio. Schema físico en `/specs/04-contracts/db-schema.md`.

---

## User

Cada jugador es un User con cuenta propia (Google OAuth).

**Campos:**
- `id` — UUID (viene de auth.users)
- `email` — string, único (viene de Google)
- `display_name` — string (viene de Google, editable)
- `photo_url` — string nullable (URL de Google o subida propia)
- `created_at` — timestamp
- `last_login_at` — timestamp nullable

**Relaciones:**
- 1 User → N Players (uno por cada Group del que es parte)
- 1 User → N GroupMemberships (Admin u Owner)

**Invariantes:**
- Un User puede ser Admin de máximo 3 Groups simultáneamente.
- Un User puede estar como Player en máximo 10 Groups en total.

---

## Group

Unidad lógica con roster, eventos y configuración.

**Campos:**
- `id` — UUID
- `name` — string, 1–40 chars
- `default_modality` — enum: `F5` | `F6` | `F8` | `F11`
- `logo_url` — string nullable
- `admin_user_id` — FK a User (el Admin actual; cambia solo con transferencia)
- `invite_code` — string único (código corto para compartir, ej. `FULBO-7X2K`)
- `created_at` — timestamp
- `archived_at` — timestamp nullable (se setea si queda huérfano; hard delete a los 30 días)
- `donation_link` — string nullable (opcional, link de Cafecito/MP del Admin)

**Relaciones:**
- 1 Group → N Players (hasta 50 activos)
- 1 Group → 0-2 Owners (vía GroupMembership con role='owner')
- 1 Group → N Events (partidos)

**Invariantes:**
- Siempre exactamente 1 Admin activo (o archivado si quedó huérfano).
- Cantidad de Owners fijos ≤ 2.
- Máximo 50 Players con `status='active'`.

---

## GroupMembership

Rol de un User dentro de un Group. Solo existe para Admin y Owners.

**Campos:**
- `id` — UUID
- `user_id` — FK a User
- `group_id` — FK a Group
- `role` — enum: `admin` | `owner`
- `assigned_by_user_id` — FK a User nullable (quién lo designó)
- `assigned_at` — timestamp

**Invariantes:**
- Por `(user_id, group_id)` solo puede existir 1 membership.
- Por `group_id`, solo 1 membership con `role='admin'`.

**Nota:** los Players regulares no tienen membership explícita; su vínculo con el Group es vía la entidad `Player`.

---

## Player

Ficha del User dentro de un Group específico.

**Campos:**
- `id` — UUID
- `user_id` — FK a User nullable (null solo si es player fantasma)
- `group_id` — FK a Group
- `display_name` — string (puede ser distinto al display_name del User, personalizable por Group)
- `photo_url` — string nullable
- `primary_position` — enum: `ARQ` | `DEF` | `MED` | `DEL`
- `secondary_position` — enum nullable: `ARQ` | `DEF` | `MED` | `DEL`
- `stats_status` — enum: `pending_approval` | `approved`
- `stats` — JSONB con las 6 stats según posición (campo o arquero)
- `current_boost` — JSONB nullable (boost activo, null si no hay)
- `is_phantom` — boolean (true si fue creado como player fantasma)
- `is_expelled` — boolean (true si fue expulsado por Admin)
- `joined_at` — timestamp
- `archived_at` — timestamp nullable (soft delete; hard delete a los 365 días)

**Invariantes:**
- `secondary_position !== primary_position`.
- Si `is_phantom=true`: `user_id=null`, `stats_status='approved'` (se aprueban auto con defaults 6/6/6/6/6/6).
- Si `stats_status='pending_approval'`, la carta solo es visible para el propio User (o el Admin del Group).
- Un User no puede tener 2 Players activos en el mismo Group.

### Sub-estructura `stats` (JSONB)

**Para jugador de campo** (`primary_position !== 'ARQ'`):
```json
{
  "pac": 7,  // velocidad
  "sho": 8,  // tiro
  "pas": 6,  // pase
  "dri": 7,  // regate
  "def": 4,  // defensa
  "phy": 6   // fuerza
}
```

**Para arquero** (`primary_position === 'ARQ'`):
```json
{
  "div": 7,  // estirada
  "han": 8,  // manos
  "kic": 6,  // saque
  "ref": 8,  // reflejos
  "spd": 5,  // velocidad de salida
  "pos": 7   // colocación
}
```

Valores enteros 1-10. Display en UI: valor × 10 = escala 1-99.

### Sub-estructura `current_boost` (JSONB)

```json
{
  "applied_at_match_id": "uuid-del-partido-donde-se-aplicó",
  "partidos_remaining": 3,
  "modifiers": {
    "pac": 2,
    "sho": 3
  },
  "reason": "victory_mvp"
}
```

`partidos_remaining` decrementa cada partido en el que el jugador participa. Cuando llega a 0, `current_boost` se setea a `null`.

---

## PlayerStatChangeLog

Log inmutable de cambios aprobados a las stats de un Player. Visible para todo el Group.

**Campos:**
- `id` — UUID
- `player_id` — FK a Player
- `changed_by_user_id` — FK a User (siempre el Admin)
- `requested_by_user_id` — FK a User nullable (el jugador que pidió revisión, null si fue cambio directo del Admin)
- `before_stats` — JSONB (snapshot previo)
- `after_stats` — JSONB (snapshot nuevo)
- `reason` — string nullable (mensaje del pedido o ajuste)
- `created_at` — timestamp

---

## StatRevisionRequest

Solicitud del jugador para que el Admin revise sus stats.

**Campos:**
- `id` — UUID
- `player_id` — FK a Player
- `user_id` — FK a User (quien pide)
- `message` — string, 1–200 chars
- `proposed_stats` — JSONB nullable (opcional; si el jugador sugiere valores)
- `status` — enum: `pending` | `approved` | `rejected`
- `resolved_by_user_id` — FK a User nullable (el Admin que resolvió)
- `resolved_at` — timestamp nullable
- `resolution_note` — string nullable
- `created_at` — timestamp

**Invariantes:**
- Máximo 1 request con `status='pending'` por Player a la vez.

---

## Event (Partido / Match)

Un partido con evento, confirmaciones, sorteo y resultado.

**Campos:**
- `id` — UUID
- `group_id` — FK a Group
- `modality` — enum: `F5` | `F6` | `F8` | `F11`
- `field_name` — string, 1–60 chars
- `field_maps_url` — string nullable (link a Google Maps)
- `scheduled_at` — timestamp
- `status` — enum: `scheduled` | `confirming` | `checked_in` | `drawn` | `played` | `cancelled`
- `team_a_name` — string, default "Equipo A"
- `team_b_name` — string, default "Equipo B"
- `team_a_score` — int nullable
- `team_b_score` — int nullable
- `mvp_player_id` — FK a Player nullable
- `draw_seed` — string nullable (semilla RNG)
- `created_by_user_id` — FK a User (Admin u Owner)
- `drawn_by_user_id` — FK a User nullable
- `played_at` — timestamp nullable
- `created_at` — timestamp

**Relaciones:**
- N Events → 1 Group
- 1 Event → N EventAttendances (confirmaciones)
- 1 Event → N MatchParticipations (solo si status >= 'drawn')
- 1 Event → 0-2 TemporaryOwners (si aplicaron)

---

## EventAttendance

Confirmación de un Player para un Event.

**Campos:**
- `id` — UUID
- `event_id` — FK a Event
- `player_id` — FK a Player
- `status` — enum: `going` | `not_going` | `maybe`
- `checked_in` — boolean (marcado por Admin/Owner en la cancha)
- `checked_in_at` — timestamp nullable
- `updated_at` — timestamp (cada vez que cambia status)
- `created_at` — timestamp

**Invariantes:**
- `(event_id, player_id)` único.
- `checked_in=true` solo si `status in ('going', 'maybe')`.

---

## MatchParticipation

Relación Player ↔ Event con equipo asignado y posición jugada (solo se crean post-sorteo).

**Campos:**
- `id` — UUID
- `event_id` — FK a Event
- `player_id` — FK a Player
- `team` — enum: `A` | `B` | `substitute`
- `assigned_position` — enum nullable: `ARQ` | `DEF` | `MED` | `DEL`
- `played_primary_position` — boolean
- `boost_applied` — JSONB nullable (snapshot del boost que el sistema aplicó a este player por este partido; null si no hubo)
- `created_at` — timestamp

**Invariantes:**
- `(event_id, player_id)` único.

---

## TemporaryOwner

Registro de Owners temporales designados automáticamente para un Event puntual.

**Campos:**
- `id` — UUID
- `event_id` — FK a Event
- `user_id` — FK a User
- `assigned_reason` — string (ej. "admin_no_confirm_no_owners")
- `confirmed_at` — timestamp nullable (null si aún no confirmó su rol)
- `expires_at` — timestamp (típicamente `event.played_at + 24h`)
- `created_at` — timestamp

**Invariantes:**
- Máximo 2 por Event.
- Un mismo User puede ser Temporary Owner varios Events.

---

## Notification

Registro de notificaciones enviadas al User.

**Campos:**
- `id` — UUID
- `user_id` — FK a User
- `type` — enum: `event_created` | `event_cancelled` | `attendance_changed` | `someone_dropped` | `owner_temporary_assigned` | `stats_pending_approval` | `stats_approved` | `stats_revision_requested` | `stats_revision_resolved` | `stats_changed_log` | `mvp_awarded` | `boost_applied` | `weekly_digest`
- `payload` — JSONB (datos contextuales)
- `read_at` — timestamp nullable
- `pushed_at` — timestamp nullable (cuando se envió el push)
- `emailed_at` — timestamp nullable
- `created_at` — timestamp

---

## PushSubscription

Suscripción del browser para Web Push.

**Campos:**
- `id` — UUID
- `user_id` — FK a User
- `endpoint` — string único
- `p256dh_key` — string
- `auth_key` — string
- `user_agent` — string nullable
- `created_at` — timestamp
- `last_used_at` — timestamp nullable

---

## Diagrama de relaciones (texto)

```
User (1) ──────┬─── (N) Player (N) ─── (1) Group
               │                             │
               ├─── (N) GroupMembership ────┤
               │                             │
               ├─── (N) Notification         │
               │                             │
               └─── (N) PushSubscription     │
                                             │
Group (1) ─── (N) Event                      │
Event (1) ─── (N) EventAttendance ─── (1) Player
Event (1) ─── (N) MatchParticipation ─── (1) Player
Event (1) ─── (0-2) TemporaryOwner ─── (1) User

Player (1) ─── (N) PlayerStatChangeLog
Player (1) ─── (N) StatRevisionRequest
```
