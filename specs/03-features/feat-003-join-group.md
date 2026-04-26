# feat-003 — Unirse a un grupo

## Objetivo

Permitir a un User unirse a un Group existente vía link de invitación o código manual, cubriendo todos los casos: jugador nuevo, jugador que vuelve (voluntario o expulsado), jugador con hard delete ejecutado, y casos especiales (grupo archivado, grupo lleno, admin cambiado).

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 3 (Unirse), §Flow 14 (Salir voluntario), §Flow 15 (Expulsar).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §12 (Histórico), §13 (Huérfanos), §15 (Límites).
- **Entidades:** [`entities.md`](../01-domain/entities.md) — `User`, `Player`, `Group`, `GroupMembership`.
- **Tipos:** [`types.ts`](../04-contracts/types.ts) — `GroupId`, `PlayerId`, `InviteCode`.
- **Errores:** [`error-model.md`](../04-contracts/error-model.md) — `INVITE_CODE_INVALID`, `GROUP_ARCHIVED`, `PLAYER_GROUP_LIMIT_REACHED`, `USER_PLAYER_GROUPS_LIMIT_REACHED`, `EXPELLED_COOLDOWN_ACTIVE`, `REINTEGRATION_REQUEST_PENDING`.
- **Schema:** [`db-schema.md`](../04-contracts/db-schema.md) — `groups`, `players`, `group_memberships`, `reintegration_requests` (tabla nueva).
- **Decisiones del engram:** `dec-061` a `dec-071`.
- **Dependencia:** reutiliza wizard de stats de `feat-001`.

---

## Alcance

### Incluye

- Unirse a grupo vía link directo (`/invite/{code}`) o código pegado (`/join`).
- Validación de código de invitación.
- Detección del estado del User respecto al Group:
  - Nuevo (nunca estuvo).
  - Miembro activo (redirect silencioso).
  - Ex-miembro voluntario en ventana de 365 días (reactivación).
  - Expulsado (solicitud de reintegro).
  - Hard delete ejecutado (+365 días) — se trata como nuevo.
- Validación de precondiciones del Group:
  - Grupo activo vs archivado.
  - Cupo de 50 Players activos.
  - Link válido incluso tras cambio de Admin.
- Validación de precondiciones del User:
  - Límite de 10 Groups como Player.
- Solicitud de reintegro para expulsados con cooldown de 30 días después de rechazo.

### No incluye

- Expulsión de jugadores (`feat-015`, backlog).
- Salida voluntaria del grupo (`feat-016`, backlog).
- Transferencia de Admin (`feat-017`, backlog).
- Resolución de solicitudes de reintegro por parte del Admin (va en `feat-011-manage-owners.md` o feature dedicado).

---

## Flujo completo

### Etapa 1 — Entrada al flow

Dos puntos de entrada:

**1a: Link directo.** El Admin compartió `https://elfulbo.app/invite/FULBO-7X2K`. El User abre el link desde WhatsApp o donde sea.

**1b: Código pegado.** El User entró a `/join` (desde la landing), pegó el código, tocó "Continuar". Redirect a `/invite/{code}`.

### Etapa 2 — Validación del código

**Ruta:** `/invite/{code}`

Al montar la ruta, **cliente consulta**:

```ts
const { data, error } = await supabase.rpc('validate_invite_code', {
  p_invite_code: code
});
```

El RPC retorna:

```ts
type ValidateInviteOutput =
  | { valid: false; reason: 'not_found' | 'archived' }
  | {
      valid: true;
      group: {
        id: GroupId;
        name: string;
        default_modality: Modality;
        logo_url: string | null;
        admin_name: string;  // hidratado con admin actual, no creador del code
        active_players_count: number;
      };
      user_status:
        | 'anonymous'
        | 'new'
        | 'active_member'
        | 'voluntary_returner'
        | 'expelled_can_request'
        | 'expelled_cooldown'
        | 'expelled_pending_request'
        | 'hard_deleted';
    };
```

### Etapa 3 — Ramificación según estado

Según el resultado del RPC, el cliente redirige o renderiza:

#### 3a: Código inválido

```
valid: false, reason: 'not_found'
```

- Toast: *"No encontramos ese código. Revisá el link o pedile uno nuevo a quien te invitó."*
- Redirect a `/` o `/join` si vino de ahí.

#### 3b: Grupo archivado

```
valid: false, reason: 'archived'
```

- Ruta: `/invite/{code}/archived`
- Pantalla:
  - Título: *"Este grupo está archivado"*.
  - Subtexto: *"El admin se fue y nadie tomó el rol todavía. Contactá al admin anterior si querés que lo active de nuevo, o escribí a soporte para recuperarlo."*
  - Link: *"Escribir a soporte"* → `mailto:ivnvldz7@gmail.com?subject=Recuperar grupo {group_name}`.
  - Botón: *"Volver al inicio"*.

#### 3c: Usuario anónimo (sin sesión)

```
valid: true, user_status: 'anonymous'
```

- Ruta: `/invite/{code}` (preview del grupo).
- UI:
  - Card del grupo: logo, nombre, modalidad, count de jugadores, nombre del admin.
  - Texto: *"Te invitaron a unirte a este grupo."*
  - Botón grande: *"Entrar con Google para unirme"*.
  - Texto chico: *"Usamos tu cuenta de Google para guardar tu carta y tus partidos."*
- Al tocar el botón, Supabase OAuth con `redirectTo=/auth/callback?next=/invite/{code}`.
- Post-callback vuelve a `/invite/{code}` con sesión activa → re-ejecuta el RPC → ramifica según nuevo estado (usualmente `new`).

#### 3d: Miembro activo (redirect silencioso)

```
valid: true, user_status: 'active_member'
```

- Redirect inmediato a `/groups/{group_id}/dashboard`.
- **Sin pantalla intermedia, sin toast.** El User nunca ve el preview (comportamiento WhatsApp).
- Decisión: `dec-051`.

#### 3e: Jugador nuevo (nunca estuvo, o hard delete ejecutado)

```
valid: true, user_status: 'new' | 'hard_deleted'
```

**Ambos se tratan idénticamente.** El sistema no distingue: `hard_deleted` es derivado solo si implementamos tracking, pero como decidimos en dec-069 NO dejar rastro, en práctica ambos son `new`.

- Validación adicional antes de mostrar preview:
  - Si `active_players_count >= 50` → redirect a `/invite/{code}/group-full`.
  - Si el User ya está en 10 Groups como Player → redirect a `/invite/{code}/user-limit`.
- Si todo OK, muestra preview del grupo + botón "Unirme".
- Al tocar "Unirme":
  - RPC `accept_invite(p_invite_code)`.
  - Crea Player con `user_id`, `group_id`, `display_name` del User, stats default, `stats_status='pending_approval'`.
  - Redirect a `/groups/{id}/onboarding-stats` (wizard de feat-001).

#### 3f: Grupo lleno

Ruta: `/invite/{code}/group-full`

- Pantalla:
  - Título: *"Este grupo está lleno"*.
  - Subtexto: *"El grupo llegó al máximo de 50 jugadores activos. Pedile al admin que archive alguno que no esté jugando para sumarte."*
  - Botón: *"Volver al inicio"*.

#### 3g: Límite de 10 Groups como Player

Ruta: `/invite/{code}/user-limit`

- Pantalla:
  - Título: *"Llegaste al máximo de grupos"*.
  - Subtexto: *"Estás en 10 grupos. Salí de alguno para sumar este."*
  - Botón: *"Ver mis grupos"* → `/dashboard`.

#### 3h: Ex-miembro voluntario (dentro de 365 días)

```
valid: true, user_status: 'voluntary_returner'
```

Ruta: `/invite/{code}/welcome-back`

**Cargar la carta previa:**

El RPC incluye el Player archivado:

```ts
type VoluntaryReturnerExtras = {
  archived_player: {
    id: PlayerId;
    primary_position: PlayerPosition;
    secondary_position: PlayerPosition | null;
    stats: PlayerStats;
    stats_status: StatsStatus;
    base_overall: number;
    tier: Tier;
    archived_at: string;
  };
};
```

- UI:
  - Título: *"¡Volviste!"*.
  - Preview de la carta tal como era al salir (mismo componente `<Card />` de feat-001).
  - Subtexto: *"Esta es tu carta del grupo {nombre}."*
  - Info: *"Te fuiste hace {X días/meses}"*.
  - Botón grande: **"Volver al grupo"**.
  - Link chico: *"Prefiero no volver"* → redirect a `/dashboard`.

- Al tocar "Volver al grupo":
  - RPC `reactivate_player(player_id)`.
  - Transacción:
    - `UPDATE players SET archived_at = NULL, current_boost = NULL WHERE id = player.id`.
    - El histórico (`match_participations`, `player_stat_change_logs`) se preserva intacto.
    - El boost activo se descarta (decisión dec-063).
  - Notificación in-app al Admin: type `player_returned` con payload `{ player_id, player_name }`.
  - Redirect a `/groups/{id}/dashboard`.

**Ajuste clave:** si el Player reactivado tiene `stats_status='approved'`, queda activo de inmediato. Si tenía `stats_status='pending_approval'` al archivarse (caso raro pero posible), se mantiene así y entra al flow normal de aprobación.

#### 3i: Expulsado sin solicitud pendiente, sin cooldown activo

```
valid: true, user_status: 'expelled_can_request'
```

Ruta: `/invite/{code}/request-return`

- UI:
  - Título: *"Para volver necesitás que el admin te apruebe"*.
  - Subtexto: *"Fuiste sacado del grupo. Si querés volver, mandá una solicitud al admin."*
  - Textarea opcional (0-200 chars): *"Contale algo al admin si querés"*. Placeholder: `Un mensaje para el admin (opcional)`.
  - Botón: **"Mandar solicitud"**.
  - Link chico: *"No, gracias"* → redirect a `/dashboard`.

- Al tocar "Mandar solicitud":
  - RPC `create_reintegration_request(p_invite_code, p_message)`.
  - Crea row en `reintegration_requests` con `status='pending'`.
  - Notificación in-app al Admin con badge.
  - Redirect a `/invite/{code}/request-sent`.

#### 3j: Expulsado con cooldown activo

```
valid: true, user_status: 'expelled_cooldown'
```

El RPC devuelve además:

```ts
{ cooldown_expires_at: string; last_rejection_at: string; last_rejection_note: string | null }
```

Ruta: `/invite/{code}/cooldown`

- UI:
  - Título: *"Ya pediste volver"*.
  - Subtexto: *"El admin no aprobó tu pedido del {last_rejection_at}. Podés volver a pedir a partir del {cooldown_expires_at}."*
  - Si hay `last_rejection_note` del admin: mostrar en un cuadro: *"Mensaje del admin: {nota}"*.
  - Botón: *"Volver al inicio"*.

**Cooldown = 30 días post-rechazo** (dec-067).

#### 3k: Expulsado con solicitud pendiente

```
valid: true, user_status: 'expelled_pending_request'
```

El RPC devuelve:

```ts
{ request_created_at: string }
```

Ruta: `/invite/{code}/request-pending`

- UI:
  - Título: *"Ya mandaste una solicitud"*.
  - Subtexto: *"Esperá que el admin la revise. La enviaste hace {X días}."*
  - Sin opción de cancelar ni re-enviar.
  - Botón: *"Volver al inicio"*.

#### 3l: Solicitud enviada (pantalla de éxito post-envío)

Ruta: `/invite/{code}/request-sent`

- UI:
  - Título: *"Mandamos tu solicitud"*.
  - Subtexto: *"Vas a recibir una notificación cuando el admin responda."*
  - Botón: *"Volver al inicio"*.

---

## Contratos de datos

### RPC `validate_invite_code`

```sql
create or replace function validate_invite_code(p_invite_code text)
returns jsonb language plpgsql security definer as $$
-- Retorna JSON con:
--   valid: bool
--   reason: text | null
--   group: jsonb | null  (id, name, default_modality, logo_url, admin_name, active_players_count)
--   user_status: text | null
--   extras: jsonb | null  (archived_player | cooldown info | request info, según user_status)
$$;
```

### RPC `accept_invite` (ya existía, se ajusta)

Valida que `active_players_count < 50` y que el User está en `<10` Groups antes de insertar. Raise error si no cumple.

### RPC `reactivate_player`

```sql
create or replace function reactivate_player(p_player_id uuid)
returns void language plpgsql security definer as $$
declare
  target_player public.players%rowtype;
begin
  select * into target_player from public.players where id = p_player_id;

  -- Validaciones
  if target_player.user_id != auth.uid() then
    raise exception 'FORBIDDEN';
  end if;
  if target_player.archived_at is null then
    raise exception 'NOT_ARCHIVED';
  end if;
  if target_player.is_expelled then
    raise exception 'EXPELLED_REQUIRES_APPROVAL';
  end if;
  if target_player.archived_at < now() - interval '365 days' then
    raise exception 'HARD_DELETE_WINDOW_EXPIRED';
  end if;

  -- Reactivar
  update public.players
  set archived_at = null, current_boost = null
  where id = p_player_id;

  -- Notificar al admin
  insert into public.notifications (user_id, type, payload)
  select
    admin_user_id,
    'player_returned',
    jsonb_build_object('player_id', p_player_id, 'player_name', target_player.display_name)
  from public.groups
  where id = target_player.group_id;
end;
$$;
```

### Tabla nueva `reintegration_requests`

```sql
create table public.reintegration_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolved_by_user_id uuid references public.users(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  constraint reintegration_message_length check (message is null or char_length(message) between 1 and 200)
);

-- Max 1 pending por Player
create unique index one_pending_reintegration_per_player
  on public.reintegration_requests(player_id) where status = 'pending';

-- Index para consultar solicitudes por grupo (admin view)
create index reintegration_group_idx on public.reintegration_requests(group_id)
  where status = 'pending';
```

### RPC `create_reintegration_request`

```sql
create or replace function create_reintegration_request(
  p_invite_code text,
  p_message text default null
) returns uuid language plpgsql security definer as $$
declare
  target_group public.groups%rowtype;
  target_player public.players%rowtype;
  new_request_id uuid;
  last_rejection timestamptz;
begin
  -- Buscar grupo
  select * into target_group from public.groups where invite_code = p_invite_code;
  if not found or target_group.archived_at is not null then
    raise exception 'INVITE_CODE_INVALID';
  end if;

  -- Buscar player expulsado del user
  select * into target_player from public.players
  where user_id = auth.uid() and group_id = target_group.id;

  if not found or target_player.is_expelled = false then
    raise exception 'NOT_EXPELLED';
  end if;

  -- Verificar cooldown
  select resolved_at into last_rejection
  from public.reintegration_requests
  where player_id = target_player.id and status = 'rejected'
  order by resolved_at desc limit 1;

  if last_rejection is not null and last_rejection > now() - interval '30 days' then
    raise exception 'EXPELLED_COOLDOWN_ACTIVE';
  end if;

  -- Verificar no hay pending
  if exists (
    select 1 from public.reintegration_requests
    where player_id = target_player.id and status = 'pending'
  ) then
    raise exception 'REINTEGRATION_REQUEST_PENDING';
  end if;

  -- Crear solicitud
  insert into public.reintegration_requests (player_id, user_id, group_id, message)
  values (target_player.id, auth.uid(), target_group.id, p_message)
  returning id into new_request_id;

  -- Notificar al admin
  insert into public.notifications (user_id, type, payload)
  select
    admin_user_id,
    'reintegration_request',
    jsonb_build_object(
      'request_id', new_request_id,
      'player_id', target_player.id,
      'player_name', target_player.display_name,
      'message', p_message
    )
  from public.groups
  where id = target_group.id;

  return new_request_id;
end;
$$;
```

### Notification types nuevos

Agregar a `NotificationType` enum:
- `player_returned` — in-app al admin cuando un jugador voluntario vuelve.
- `reintegration_request` — in-app al admin cuando hay nueva solicitud de reintegro.

Canal (tabla en business-rules §14.2):

| Tipo | Push | Email | In-app |
|------|------|-------|--------|
| `player_returned` | ❌ | ❌ | ✅ (solo Admin) |
| `reintegration_request` | ❌ | ❌ (se incluye en digest diario) | ✅ (solo Admin, badge con contador) |

---

## Validaciones (Zod schemas)

```ts
const inviteCodeSchema = z.string().regex(/^FULBO-[A-Z0-9]{6}$/);

const reintegrationRequestSchema = z.object({
  inviteCode: inviteCodeSchema,
  message: z.string().trim().max(200).nullable().optional(),
});
```

---

## Edge cases resueltos

| Caso | Comportamiento |
|------|----------------|
| User sin sesión abre link directo | Muestra preview con botón "Entrar con Google". Post-OAuth vuelve al mismo link. |
| User con sesión, nunca estuvo en el grupo | Preview + botón "Unirme" + wizard de stats (feat-001). |
| User con sesión, Player activo existente | Redirect silencioso al dashboard del grupo. |
| User con sesión, Player archivado voluntario <365 días | Pantalla "¡Volviste!" con preview de carta previa. |
| User con sesión, Player archivado voluntario >365 días | RPC ya hizo hard delete. Se trata como nuevo (no hay rastro). |
| User con sesión, Player expulsado sin solicitud ni cooldown | Pantalla "Mandar solicitud al admin". |
| User con sesión, Player expulsado con solicitud pendiente | Pantalla "Ya pediste, esperá respuesta". |
| User con sesión, Player expulsado con cooldown activo | Pantalla "Podés volver a pedir el DD/MM". |
| User con sesión, pedido al grupo lleno (50 players) | Pantalla "Este grupo está lleno, pedí al admin que archive alguno". |
| User con sesión en 10 Groups, recibe link al 11vo | Pantalla "Llegaste al máximo de grupos, salí de uno". |
| Grupo archivado (admin se fue sin transferir) | Pantalla "Este grupo está archivado, contactá al admin anterior o escribí a soporte". |
| Grupo con hard delete ejecutado (pasados 30 días de archivado) | RPC devuelve `not_found`. Se muestra "No encontramos ese código". |
| Link de admin que transfirió rol | El link sigue siendo válido (usa `invite_code` del grupo). Preview muestra admin actual. |
| User clickea el mismo link 2 veces en segundos (doble submit) | `accept_invite` es idempotente: si ya existe Player activo, devuelve OK sin duplicar. |
| User rechaza permiso de Google en mid-OAuth | Vuelve a la pantalla anónima sin sesión. Puede reintentar. |
| Código pegado con espacios o sin guion | Regex de validación normaliza (auto-uppercase, auto-hyphen en /join). |
| User reactivado tenía stats pending_approval | Se mantiene en pending después de reactivar. No se fuerza aprobación. |
| Admin aprueba solicitud de reintegro y el Player vuelve (va en otro feature) | Al aprobar, se ejecuta reactivación con stats preservadas. Se notifica al User. (Detalle en feat-004 o feature dedicado). |
| Cooldown de 30 días exacto: el día 30 a las 23:59 | Consulta `< now() - interval '30 days'` → sigue activo. A las 00:00 del día 31, pasa. |
| Usuario expulsado intenta crear un request vía API directo saltando UI | Server-side raise `EXPELLED_COOLDOWN_ACTIVE` o `REINTEGRATION_REQUEST_PENDING` según corresponda. RLS protege. |

---

## UI/UX específicos

### Responsive

- **Mobile:** preview del grupo ocupa full screen, botón de acción sticky abajo.
- **Desktop:** preview centrado con max-width 500px.

### Transiciones

- De `/invite/{code}` a la pantalla que corresponde según estado: fade suave (200ms) con Framer Motion.
- De `/welcome-back` al dashboard post-reactivación: slide natural.

### Performance

- `validate_invite_code` es una RPC única que trae todo lo necesario (group info + user_status + extras). No hay N+1 queries desde el cliente.
- El preview de la carta en "welcome-back" se calcula en cliente con los stats recibidos (mismo cálculo que feat-001).

---

## Tests obligatorios

### Unit

- `src/lib/services/invites.test.ts`:
  - `validateInviteCode` con código válido → retorna info del grupo.
  - Con código inexistente → `INVITE_CODE_INVALID`.
  - Con grupo archivado → retorna `valid: false, reason: 'archived'`.

- `src/lib/services/reintegration.test.ts`:
  - `createReintegrationRequest` happy path.
  - Con cooldown activo → `EXPELLED_COOLDOWN_ACTIVE`.
  - Con request pending → `REINTEGRATION_REQUEST_PENDING`.
  - Mensaje > 200 chars → `VALIDATION_ERROR`.

- `src/components/welcome-back/__tests__/WelcomeBackCard.test.tsx`:
  - Renderiza preview de carta con stats archivadas.
  - Botón "Volver al grupo" dispara `reactivatePlayer`.

### Integration

- `tests/integration/join-group-flow.test.ts`:
  - Flow completo: User nuevo acepta invitación → Player creado con pending → wizard aparece.
  - User voluntario vuelve → Player restaurado con stats + histórico, sin boost activo.
  - User expulsado envía solicitud → row en `reintegration_requests` + notification al admin.
  - User expulsado con cooldown → error claro y redirect a pantalla de cooldown.
  - Grupo lleno bloquea `accept_invite`.
  - User en 10 Groups bloquea `accept_invite`.

### RLS

- `tests/integration/rls.test.ts` (sección reintegration):
  - User puede INSERT en `reintegration_requests` solo si es el propio User expulsado.
  - User NO puede UPDATE `status` de `reintegration_requests` (solo el RPC `resolve_reintegration` lo hace, SECURITY DEFINER).
  - User NO puede ver `reintegration_requests` de otros Users.
  - Admin del Group puede ver todos los `reintegration_requests` de su Group con `status='pending'`.

---

## Copy (textos) — versión final argentino coloquial

- Pantalla welcome-back: *"¡Volviste!"* / *"Esta es tu carta del grupo {nombre}"* / *"Te fuiste hace {X}"*
- Botón welcome-back: *"Volver al grupo"* / *"Prefiero no volver"*
- Pantalla archivado: *"Este grupo está archivado"* / *"El admin se fue y nadie tomó el rol todavía. Contactá al admin anterior si querés que lo active de nuevo, o escribí a soporte para recuperarlo."*
- Botón soporte: *"Escribir a soporte"*
- Pantalla grupo lleno: *"Este grupo está lleno"* / *"El grupo llegó al máximo de 50 jugadores activos. Pedile al admin que archive alguno que no esté jugando para sumarte."*
- Pantalla user-limit: *"Llegaste al máximo de grupos"* / *"Estás en 10 grupos. Salí de alguno para sumar este."*
- Pantalla request-return: *"Para volver necesitás que el admin te apruebe"* / *"Fuiste sacado del grupo. Si querés volver, mandá una solicitud al admin."*
- Textarea: *"Contale algo al admin si querés"* / placeholder: *"Un mensaje para el admin (opcional)"*
- Botón reintegro: *"Mandar solicitud"* / *"No, gracias"*
- Pantalla cooldown: *"Ya pediste volver"* / *"El admin no aprobó tu pedido del {fecha}. Podés volver a pedir a partir del {fecha}."*
- Pantalla request-pending: *"Ya mandaste una solicitud"* / *"Esperá que el admin la revise. La enviaste hace {X}."*
- Pantalla request-sent: *"Mandamos tu solicitud"* / *"Vas a recibir una notificación cuando el admin responda."*

---

## Criterios de aceptación (Auditor checklist)

- [ ] `/invite/{code}` ejecuta `validate_invite_code` y ramifica según resultado.
- [ ] User anónimo ve preview + botón Google OAuth.
- [ ] Post-OAuth vuelve al mismo link.
- [ ] Miembro activo hace redirect silencioso al dashboard.
- [ ] User nuevo ve preview + "Unirme" + wizard.
- [ ] User voluntario retornante ve `/welcome-back` con preview de carta previa.
- [ ] Reactivación preserva stats y histórico, descarta boost.
- [ ] Expulsado sin requests ni cooldown ve `/request-return`.
- [ ] Expulsado con cooldown ve `/cooldown` con fecha de desbloqueo.
- [ ] Expulsado con request pendiente ve `/request-pending`.
- [ ] Grupo archivado muestra `/archived` con link a soporte.
- [ ] Grupo lleno muestra `/group-full`.
- [ ] User con 10 Groups ve `/user-limit`.
- [ ] Cooldown calcula correctamente 30 días desde última resolución rechazada.
- [ ] Max 1 request pendiente por Player (enforced en DB).
- [ ] Link sigue válido después de transferencia de admin.
- [ ] `reintegration_requests` tiene RLS bien aplicado.
- [ ] Notificaciones `player_returned` y `reintegration_request` van solo in-app al admin.
- [ ] Todos los tests unit, integration y RLS pasan.

---

## Fuera de alcance

- UI del admin para resolver solicitudes de reintegro (va en `feat-011-manage-owners.md`).
- Historial de solicitudes rechazadas visible al User (simple: no lo mostramos).
- Notificación al User cuando el admin aprueba/rechaza (va en `feat-012-notifications.md`).
- Búsqueda de grupos públicos (no existen).
- Compartir link desde la app después de unirse (va en `feat-002-create-group.md` para el Admin).
