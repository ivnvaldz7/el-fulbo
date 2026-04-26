# feat-004 — Admin dashboard (resolución de pendientes)

## Objetivo

Dar al Admin un centro de control unificado donde vea y resuelva todas sus tareas pendientes de gestión del grupo: aprobar cartas nuevas, revisiones de stats y solicitudes de reintegro. Sin fragmentación en 3 pantallas, sin tareas que se pierdan entre la navegación.

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 4 (Aprobar stats), §Flow 5 (Revisión de stats).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §3 (Flujo de stats iniciales), §4 (Revisiones de stats), §14 (Notificaciones).
- **Entidades:** [`entities.md`](../01-domain/entities.md) — `Player`, `StatRevisionRequest`, `PlayerStatChangeLog`, `ReintegrationRequest`, `Notification`.
- **Tipos:** [`types.ts`](../04-contracts/types.ts) — `PlayerStats`, `RevisionStatus`, `PlayerId`, `ResolveStatRevisionInput`.
- **Errores:** [`error-model.md`](../04-contracts/error-model.md) — `VALIDATION_ERROR`, `CONFLICT`, `FORBIDDEN`, `NOT_FOUND`.
- **Schema:** [`db-schema.md`](../04-contracts/db-schema.md) — `players`, `stat_revision_requests`, `reintegration_requests`, `player_stat_change_logs`.
- **Decisiones del engram:** `dec-072` a `dec-087`.
- **Dependencias:**
  - feat-001: componente `<Card />` para previews, wizard de stats reutilizado.
  - feat-002: bootstrap del Group, permisos del Admin.
  - feat-003: tabla `reintegration_requests`, flow de reactivación.

---

## Alcance

### Incluye

- Widget de pendientes en el dashboard del grupo (visible solo al Admin).
- Dashboard global `/my-admin` (cross-group, solo para Admins de ≥1 grupo).
- Pantalla dedicada `/groups/{id}/admin-tasks` con 3 secciones colapsables.
- Orden por urgencia entre secciones (reintegros → cartas → revisiones).
- Agrupamiento por antigüedad dentro de cada sección (+7 días arriba, recientes abajo).
- **Cartas nuevas:** resolución inline (expandible con sliders).
- **Revisiones:** pantalla dedicada con dual card (actual vs propuesta) + deltas.
- **Reintegros:** pantalla dedicada con card del jugador al irse + mensaje.
- Optimistic locking para evitar resoluciones duplicadas entre dispositivos.
- Notificaciones a jugadores según resolución (aprobación, rechazo, reintegro).
- Cleanup automático de pendientes cuando el jugador sale antes de aprobar.

### No incluye

- UI de gestión del grupo más allá de pendientes (eso es feat-002 settings).
- Expulsión activa de jugadores (va en `feat-015`, backlog).
- Edición directa de stats fuera del flujo de aprobación/revisión (va en `feat-016`, backlog).
- Notificaciones push (va en `feat-012-notifications.md`; acá solo se crean los registros).

---

## Flujo completo

### Etapa 1 — Detección de pendientes

Al entrar al dashboard del grupo (`/groups/{id}/dashboard`), el Admin ve un **widget condicional** arriba de todo:

**Si hay ≥1 pendiente de cualquier tipo:**

- Widget con fondo sutil distinto (naranja suave).
- Contador: *"Tenés X pendientes"* (donde X es suma total).
- Botón: *"Ver"* → lleva a `/groups/{id}/admin-tasks`.

**Si no hay pendientes:**

- Widget NO se renderiza. Dashboard limpio.

**Cálculo del contador:** suma de:
- Players con `stats_status='pending_approval'` que no están archivados.
- `stat_revision_requests` con `status='pending'` en este Group.
- `reintegration_requests` con `status='pending'` en este Group.

### Etapa 2 — Dashboard global `/my-admin`

Accesible desde el menú principal de navegación, **solo si el User es Admin de ≥1 grupo**.

**UI:**

- Header: *"Mis grupos como admin"*.
- Para cada grupo administrado:
  - Logo + nombre del grupo.
  - Contador de pendientes: *"3 pendientes"* (si hay) o *"Al día"* (si 0).
  - Si hay pendientes +7 días: badge rojo chico con *"{N} atrasados"*.
  - Tap → `/groups/{group_id}/admin-tasks`.
- Los grupos se ordenan por **cantidad total de pendientes** descendente; si hay empate, por antigüedad del pendiente más viejo.

**UX detail:** si el User solo administra 1 grupo, `/my-admin` muestra la misma info que el widget del grupo. Redundante pero no doloroso. Con múltiples grupos, es el lugar de priorización.

### Etapa 3 — Pantalla `/groups/{id}/admin-tasks`

**Layout:**

- Header: *"Pendientes del grupo"* + botón volver.
- 3 secciones colapsables en orden fijo:
  1. **Reintegros** (si count > 0; si no, colapsado con gris *"Reintegros (0)"*).
  2. **Cartas nuevas**.
  3. **Revisiones**.

Cada sección tiene:
- Contador en el header: *"Reintegros (2)"*.
- Ícono de expandir/colapsar.
- **Por default, expandida si tiene ≥1 item.**
- Dentro, los items se subdividen visualmente:
  - **"Esperando +7 días"** con contador propio y color de atención (naranja).
  - **"Recientes"** con contador propio, color neutro.
  - Si todos los items son recientes, no se muestra el subtítulo.
  - Si todos son +7 días, tampoco.

**Cada item de la lista muestra:**
- Foto + nombre del jugador.
- Subtexto con contexto breve (ej: *"Cargó stats hace 5 días"*, *"Pidió revisión hace 10 días"*, *"Solicitó volver ayer"*).
- Tap → acción según tipo (inline expand o navegación a pantalla dedicada).

---

### Etapa 4a — Resolución inline de carta nueva

Al tocar un item de la sección **"Cartas nuevas"**, el item se expande inline dentro de la misma lista, con animación suave.

**UI expandida:**

- Preview de la card (mismo componente `<Card />` de feat-001) con los valores propuestos por el jugador, tier calculado en vivo.
- 6 sliders editables con los valores del jugador precargados.
- **Los sliders permiten hasta 10** (el Admin puede subir más allá del tope de 8 que aplicaba al jugador).
- Cambios en sliders actualizan la card preview en tiempo real.
- Botón primario: **"Aprobar"**.
- Link secundario: *"Rechazar"* (abre modal con textarea opcional de hasta 200 chars y explicación: *"Tu compañero va a ver que rechazaste. Podés dejar un mensaje."*).

**Flujo "Aprobar":**

1. Se ejecuta RPC `approve_initial_stats(player_id, final_stats, last_known_updated_at)`.
2. RPC valida optimistic locking: si `updated_at` del Player cambió, devuelve `CONFLICT`.
3. Si todo OK:
   - `UPDATE players SET stats_status='approved', stats=final_stats, updated_at=now() WHERE id=player_id`.
   - Insert en `player_stat_change_logs` con `before_stats=NULL`, `after_stats=final_stats`, `reason='initial_approval'`.
   - Notification in-app para todos los miembros del Group (type `stats_changed_log`, visible en feed).
   - Notification para el jugador (`stats_approved`, in-app + push).
4. El item desaparece de la lista con animación de check verde.
5. Contador del widget se decrementa.

**Flujo "Rechazar":**

1. Modal con textarea opcional.
2. Se ejecuta RPC `reject_initial_stats(player_id, note, last_known_updated_at)`.
3. El Player mantiene `stats_status='pending_approval'` pero se registra la nota.
4. Notification al jugador con la nota: *"El admin no aprobó tus stats. Mensaje: {nota}"*.

**Consideración especial:** rechazar stats iniciales deja al jugador en un estado donde debe volver al wizard. En la notificación se le incluye link para reabrir `/groups/{id}/onboarding-stats`.

---

### Etapa 4b — Resolución de revisión (pantalla dedicada)

Al tocar un item de la sección **"Revisiones"**, navegación a `/groups/{id}/admin-tasks/revisions/{request_id}`.

**UI:**

- Header: *"Revisión de stats"* + botón volver.
- Arriba, **dual card layout**:
  - **Card actual**: stats aprobadas del Player hoy.
  - **Card propuesta**: stats que el jugador sugiere (o stats actuales si no propuso cambios).
  - Entre ambas, badges con deltas: *"PAC 7→8 (+1)"*, *"SHO 6→7 (+1)"*, etc.
  - Desktop: lado a lado. Mobile: actual arriba, propuesta abajo.
- Debajo, cuadro con la solicitud del jugador:
  - Foto + nombre del jugador.
  - Mensaje del jugador (si lo dejó) en italic: *"Me sentí mejor en el ataque últimamente"*.
  - Si no dejó mensaje: *"El jugador no dejó mensaje."*
  - Fecha de la solicitud: *"Hace 3 días"*.
- Debajo, **6 sliders editables** con los valores propuestos precargados.
  - Cambios se reflejan en la card propuesta en vivo.
  - Permite hasta 10 (el Admin puede ajustar sin tope del jugador).
  - Excepción: si el Player es el propio Admin (auto-revisión), se aplica el tope de 8 (invariante `dec-054`).
- Botón primario: **"Aprobar"**.
- Link secundario: *"Rechazar"* (modal con textarea opcional).

**Flujo "Aprobar":**

1. RPC `approve_stat_revision(request_id, final_stats, last_known_updated_at)`.
2. Optimistic locking.
3. Si OK:
   - `UPDATE players SET stats=final_stats WHERE id=player_id`.
   - `UPDATE stat_revision_requests SET status='approved', resolved_by_user_id=admin.id, resolved_at=now()`.
   - Insert en `player_stat_change_logs` con `before_stats=valores_previos`, `after_stats=final_stats`, `requested_by_user_id=jugador.id`, `reason='revision_approved'`.
   - Notifications: `stats_changed_log` a todos los miembros + `stats_revision_resolved` al jugador (in-app + push).
4. Redirect a `/groups/{id}/admin-tasks`.

**Flujo "Rechazar":**

1. Modal con textarea opcional.
2. RPC `reject_stat_revision(request_id, note, last_known_updated_at)`.
3. `UPDATE stat_revision_requests SET status='rejected', resolution_note=note, resolved_at=now()`.
4. Notification al jugador con la nota (in-app + push).
5. **Sin notification al grupo** (no hubo cambio de stats; el rechazo es privado).
6. Redirect a `/groups/{id}/admin-tasks`.

---

### Etapa 4c — Resolución de reintegro (pantalla dedicada)

Al tocar un item de la sección **"Reintegros"**, navegación a `/groups/{id}/admin-tasks/reintegrations/{request_id}`.

**UI:**

- Header: *"Solicitud de reintegro"* + botón volver.
- Arriba, layout de dos columnas (mobile: vertical):
  - **Izquierda (o arriba):** card del Player con los stats que tenía al ser expulsado. Mismo componente `<Card />`.
  - **Derecha (o abajo):** cuadro informativo:
    - Fecha de expulsión: *"Expulsado hace 2 meses"*.
    - Mensaje del jugador (si dejó): texto en italic.
    - Si no dejó mensaje: *"No dejó mensaje para el admin."*
    - **Últimos 3 partidos que jugó** (fechas): *"15/ene, 22/ene, 29/ene"*. Solo si hay datos.
- Debajo, dos botones:
  - **"Aprobar"** (verde, grande) → ejecuta aprobación directa, sin modal.
  - **"Rechazar"** (gris, secundario) → abre modal.

**Modal de "Rechazar":**

- Título: *"¿Rechazar la solicitud?"*
- Texto: *"Si rechazás, {nombre} va a tener que esperar 30 días para volver a pedir."*
- Textarea opcional: *"Mensaje para {nombre} (opcional)"* (hasta 200 chars).
- Botones: *"Cancelar"* / *"Rechazar"*.

**Flujo "Aprobar":**

1. RPC `approve_reintegration_request(request_id, last_known_updated_at)`.
2. Optimistic locking.
3. Si OK, transacción:
   - `UPDATE reintegration_requests SET status='approved', resolved_by_user_id=admin.id, resolved_at=now()`.
   - `UPDATE players SET archived_at=NULL, is_expelled=false, current_boost=NULL WHERE id=player.id`.
   - Notification al jugador (`reintegration_approved`, in-app + push).
   - Notification al Admin (`player_returned`, in-app).
4. Redirect a `/groups/{id}/admin-tasks`.

**Flujo "Rechazar":**

1. Modal con nota opcional.
2. RPC `reject_reintegration_request(request_id, note, last_known_updated_at)`.
3. `UPDATE reintegration_requests SET status='rejected', resolution_note=note, resolved_at=now()`. Cooldown de 30 días arranca con este `resolved_at`.
4. Notification al jugador con la nota (`reintegration_rejected`, in-app + push).
5. Redirect a `/groups/{id}/admin-tasks`.

---

## Edge cases resueltos

| Caso | Comportamiento |
|------|----------------|
| Jugador pending elimina cuenta antes de que el admin apruebe | El Player queda archivado (cascade). Próximo refresh de `/admin-tasks`, el item desaparece. Toast: *"El jugador eliminó su cuenta."* |
| Jugador pending sale del grupo voluntariamente antes de aprobar | Mismo que arriba, pero toast: *"{nombre} se dio de baja antes de aprobar."* |
| Jugador con revisión pendiente sale del grupo | La `stat_revision_request` queda huérfana. Cronjob de limpieza la marca como `status='cancelled'`. Desaparece de la lista con toast. |
| Admin en 2 dispositivos aprueba el mismo pendiente al mismo tiempo | Optimistic locking vía `updated_at`. El segundo dispositivo recibe error `CONFLICT`. Se muestra: *"Ya resolviste este pendiente en otro dispositivo. Actualizamos la lista."* + refresh. |
| Admin rechaza una revisión, jugador pide nueva revisión inmediatamente | Posible: el jugador puede crear nueva request después de un rechazo. La nueva aparece en la lista del admin como cualquier otro pendiente. No hay cooldown para revisiones de stats. |
| Admin aprueba reintegro pero el Group llegó al límite de 50 players | RPC valida count al aprobar. Si `count >= 50`, devuelve error `PLAYER_GROUP_LIMIT_REACHED`. Toast: *"El grupo está lleno. Archivá alguno antes de aceptar este reintegro."* |
| Admin rechaza reintegro sin dejar nota | Permitido. El jugador ve: *"El admin no aprobó tu pedido."* sin detalles. |
| Admin recibe notification de nuevo pendiente mientras está resolviendo otro | La lista se refresca silenciosamente al terminar la resolución actual. El nuevo pendiente aparece en el próximo render. |
| Admin vuelve de vacaciones con 10 pendientes | Se muestran agrupados por antigüedad: *"Esperando +7 días (7)"* arriba, *"Recientes (3)"* abajo. Sin banner ni modal intrusivo. |
| Admin es el propio Player que pidió revisión (auto-revisión) | La pantalla de revisión aplica el tope de 8 en los sliders (invariante `dec-054`). El admin no puede auto-aumentar a 9-10. |
| Admin del grupo transfiere admin durante una resolución en curso | El nuevo admin ve los pendientes en su `/admin-tasks`. El que estaba resolviendo recibe error `FORBIDDEN` si intenta aplicar la acción. Se sugiere volver atrás. |
| Pendiente de cartas nuevas + Admin lo expande pero no lo resuelve, cierra la app | El estado expandido no se persiste. Próximo ingreso, la lista aparece colapsada (comportamiento esperado). |
| Player pending con 30 días de antigüedad (aún sin aprobar) | Aparece en *"Esperando +7 días"*. Además, en el feed público del Group aparece en la sección *"Esperando aprobación"* (dec-048) desde hace 27 días. |

---

## Contratos de datos

### RPCs nuevos

**Approve initial stats:**

```sql
create or replace function approve_initial_stats(
  p_player_id uuid,
  p_final_stats jsonb,
  p_last_known_updated_at timestamptz
) returns void language plpgsql security definer as $$
-- Valida que el user auth.uid() es admin del group del player
-- Valida que stats_status = 'pending_approval'
-- Valida optimistic locking contra p_last_known_updated_at
-- Aplica invariante dec-054 si el admin se auto-aprueba
-- UPDATE players + INSERT player_stat_change_logs + crea notifications
$$;
```

**Reject initial stats:**

```sql
create or replace function reject_initial_stats(
  p_player_id uuid,
  p_note text,
  p_last_known_updated_at timestamptz
) returns void language plpgsql security definer as $$
-- El Player sigue pending, pero se crea una notification al jugador con la nota
-- No se crea stat_change_log (porque no hubo cambio)
$$;
```

**Approve stat revision:**

```sql
create or replace function approve_stat_revision(
  p_request_id uuid,
  p_final_stats jsonb,
  p_last_known_updated_at timestamptz
) returns void language plpgsql security definer as $$
-- Valida admin + status='pending' + locking
-- Valida tope 8 si el jugador es el propio admin
-- UPDATE players.stats + UPDATE stat_revision_requests
-- INSERT player_stat_change_logs + notifications
$$;
```

**Reject stat revision:**

```sql
create or replace function reject_stat_revision(
  p_request_id uuid,
  p_note text,
  p_last_known_updated_at timestamptz
) returns void language plpgsql security definer as $$
-- UPDATE stat_revision_requests SET status='rejected'
-- Notification al jugador
-- Sin stat_change_log (no hubo cambio)
$$;
```

**Approve reintegration:**

```sql
create or replace function approve_reintegration_request(
  p_request_id uuid,
  p_last_known_updated_at timestamptz
) returns void language plpgsql security definer as $$
-- Valida admin + status='pending' + locking
-- Valida que el Group no está lleno (50 players)
-- UPDATE reintegration_requests + UPDATE players (reactivar)
-- Notifications a jugador y admin
$$;
```

**Reject reintegration:**

```sql
create or replace function reject_reintegration_request(
  p_request_id uuid,
  p_note text,
  p_last_known_updated_at timestamptz
) returns void language plpgsql security definer as $$
-- UPDATE reintegration_requests SET status='rejected', resolved_at=now() (dispara cooldown de 30 días)
-- Notification al jugador con la nota
$$;
```

### Queries del cliente

**Carga inicial del widget:**

```ts
const { data } = await supabase.rpc('get_pending_tasks_summary', {
  p_group_id: groupId,
});
// Retorna: { cards_new: 3, revisions: 1, reintegrations: 0, oldest_pending_days: 12 }
```

**Carga inicial del dashboard global `/my-admin`:**

```ts
const { data } = await supabase.rpc('get_admin_groups_summary', {
  p_user_id: user.id,
});
// Retorna: Array<{ group_id, group_name, logo_url, pending_count, overdue_count }>
```

**Carga del `/admin-tasks` con detalle:**

```ts
const { data } = await supabase.rpc('get_admin_tasks_detail', {
  p_group_id: groupId,
});
// Retorna: { cards_new: [...], revisions: [...], reintegrations: [...] }
// Cada array incluye todo lo necesario para renderizar los items
// Incluye updated_at de cada recurso para optimistic locking
```

### Nuevos notification types (agregar a enum)

- `stats_approved` (existía, ahora con trigger más robusto)
- `stats_changed_log` (existía, ver dec-037)
- `reintegration_approved` — in-app + push al jugador
- `reintegration_rejected` — in-app + push al jugador
- `player_returned` (existía, ver feat-003)

### Tabla de notificaciones (actualizar `business-rules.md §14.2`)

| Tipo | Push | Email | In-app |
|------|------|-------|--------|
| `stats_approved` | ✅ | ❌ | ✅ |
| `stats_changed_log` | ❌ | ❌ | ✅ (todos los miembros) |
| `stats_revision_resolved` | ✅ | ❌ | ✅ |
| `reintegration_approved` | ✅ | ❌ | ✅ |
| `reintegration_rejected` | ✅ | ❌ | ✅ |
| `player_returned` | ❌ | ❌ | ✅ (solo Admin) |

---

## Cleanup automático (cronjobs)

Agregar a Supabase pg_cron:

```sql
-- Cancelar stat_revision_requests cuyos Players están archivados
select cron.schedule('cancel-orphan-revisions', '0 2 * * *', $$
  update public.stat_revision_requests
  set status = 'cancelled', resolved_at = now()
  where status = 'pending'
  and player_id in (
    select id from public.players where archived_at is not null
  );
$$);

-- Cancelar reintegration_requests cuyos Groups están archivados
select cron.schedule('cancel-orphan-reintegrations', '0 2 * * *', $$
  update public.reintegration_requests
  set status = 'cancelled', resolved_at = now()
  where status = 'pending'
  and group_id in (
    select id from public.groups where archived_at is not null
  );
$$);
```

---

## Validaciones (Zod schemas)

```ts
const approveStatsSchema = z.object({
  playerId: z.string().uuid(),
  finalStats: fieldOrGoalkeeperStatsSchema, // unión
  lastKnownUpdatedAt: z.string().datetime(),
});

const rejectSchema = z.object({
  id: z.string().uuid(),
  note: z.string().trim().max(200).nullable(),
  lastKnownUpdatedAt: z.string().datetime(),
});
```

---

## UI/UX específicos

### Responsive

- **Mobile:** widget en el dashboard ocupa full-width. `/admin-tasks` con items en lista vertical. Dual card en revisiones: actual arriba, propuesta abajo.
- **Desktop:** `/my-admin` en grid 2-3 columnas según ancho. Dual card en revisiones lado a lado. Cards máx-width 480px cada una.

### Animaciones (Framer Motion)

- Expansión inline de cartas nuevas: `height: auto` con `ease-out`, 250ms.
- Item resuelto: fade + slide left + check verde antes de quitarse de la lista.
- Transiciones entre pantallas: slide horizontal natural.

### Accesibilidad

- Todas las cards con `aria-label` descriptivo: *"Carta pendiente de Juan Pérez, hace 5 días"*.
- Sliders con `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.
- Focus trap en modales.
- Anuncios por screen reader cuando se resuelve un pendiente: *"Pendiente aprobado"*.

### Performance

- RPCs batch: una sola llamada carga todo el dashboard. No N+1.
- Optimistic UI: al tocar "Aprobar", el item desaparece inmediatamente de la lista. Si falla, se restaura con toast de error.
- Refresh silencioso cada 60 segundos mientras la pantalla está abierta (para detectar cambios de otros dispositivos).

---

## Tests obligatorios

### Unit

- `src/lib/services/admin-tasks.test.ts`:
  - `approveInitialStats` happy path.
  - Optimistic locking: updated_at stale → `CONFLICT`.
  - Admin no-admin del grupo intenta aprobar → `FORBIDDEN`.
  - Approve con stats > 10 → `VALIDATION_ERROR`.
  - Approve stats de player archivado → `NOT_FOUND`.
  - Auto-aprobación del admin con stats > 8 → `VALIDATION_ERROR` (dec-054).

- `src/lib/services/revisions.test.ts`:
  - `approveStatRevision` happy path.
  - `rejectStatRevision` sin nota → OK.
  - Revision ya resuelta → `CONFLICT`.

- `src/lib/services/reintegrations.test.ts`:
  - `approveReintegrationRequest` happy path.
  - Group lleno → `PLAYER_GROUP_LIMIT_REACHED`.
  - `rejectReintegrationRequest` dispara cooldown correctamente.

### Integration

- `tests/integration/admin-tasks-flow.test.ts`:
  - Admin ve widget con count correcto.
  - Admin abre `/admin-tasks`, ve 3 secciones.
  - Aprobación inline de carta: Player pasa a approved, stat_change_log se crea, notifications correctas.
  - Aprobación de revisión: stats se actualizan, log se crea.
  - Aprobación de reintegro: Player se reactiva, is_expelled=false, boost=null.
  - Rechazo con nota: nota aparece en la notification del jugador.
  - Race condition: 2 devices intentan aprobar, 1 gana, otro recibe CONFLICT.

- `tests/integration/cleanup-crons.test.ts`:
  - Revisions de Players archivados se cancelan automáticamente.
  - Reintegrations de Groups archivados se cancelan.

### RLS

- `tests/integration/rls.test.ts` (sección admin):
  - Solo el Admin del Group puede ejecutar los RPCs.
  - Owners (fijos y temporales) NO pueden aprobar/rechazar nada de stats ni reintegros.
  - Player no-admin NO puede leer otras revisiones/reintegros.

---

## Copy (textos) — versión final argentino coloquial

- Widget count: *"Tenés {X} pendientes"* / *"Ver"*
- Widget al día: (no se renderiza)
- Dashboard global header: *"Mis grupos como admin"*
- Card de grupo con pendientes: *"{X} pendientes"* / *"Al día"* / *"{Y} atrasados"*
- `/admin-tasks` header: *"Pendientes del grupo"*
- Secciones: *"Reintegros"* / *"Cartas nuevas"* / *"Revisiones"*
- Subsección atrasados: *"Esperando +7 días"*
- Subsección recientes: *"Recientes"*
- Item carta nueva: *"Cargó stats hace {X}"*
- Item revisión: *"Pidió revisión hace {X}"*
- Item reintegro: *"Solicitó volver hace {X}"*
- Botón principal cartas/revisiones: *"Aprobar"*
- Link rechazo: *"Rechazar"*
- Modal rechazo stats título: *"¿Rechazar?"*
- Modal rechazo stats texto: *"Tu compañero va a ver que rechazaste. Podés dejar un mensaje."*
- Modal rechazo reintegro título: *"¿Rechazar la solicitud?"*
- Modal rechazo reintegro texto: *"Si rechazás, {nombre} va a tener que esperar 30 días para volver a pedir."*
- Textarea placeholder: *"Mensaje para {nombre} (opcional)"*
- Modal botones: *"Cancelar"* / *"Rechazar"*
- Toast jugador se fue: *"{nombre} se dio de baja antes de aprobar."*
- Toast cuenta eliminada: *"El jugador eliminó su cuenta."*
- Toast race condition: *"Ya resolviste este pendiente en otro dispositivo. Actualizamos la lista."*
- Toast grupo lleno en reintegro: *"El grupo está lleno. Archivá alguno antes de aceptar este reintegro."*
- Card fecha expulsión: *"Expulsado hace {X}"*
- No mensaje del jugador: *"No dejó mensaje para el admin."*

---

## Criterios de aceptación (Auditor checklist)

- [ ] Widget aparece en el dashboard del grupo solo si hay ≥1 pendiente.
- [ ] Widget invisible para non-Admin.
- [ ] Dashboard `/my-admin` accesible solo si el User administra ≥1 grupo.
- [ ] `/my-admin` ordena grupos por cantidad de pendientes.
- [ ] `/admin-tasks` muestra 3 secciones en orden: reintegros, cartas nuevas, revisiones.
- [ ] Items se subdividen correctamente por antigüedad (+7 días / recientes).
- [ ] Cartas nuevas se expanden inline con sliders editables.
- [ ] Revisiones navegan a pantalla dedicada con dual card.
- [ ] Reintegros navegan a pantalla dedicada con card del jugador al irse.
- [ ] Aprobación de stats iniciales: Player pasa a approved, se crea stat_change_log, notifications correctas.
- [ ] Aprobación de revisión: stats del Player se actualizan, log se crea, grupo se notifica in-app.
- [ ] Aprobación de reintegro: Player reactivado con `archived_at=NULL`, `is_expelled=false`, `current_boost=NULL`.
- [ ] Rechazo de revisión: `status='rejected'`, notification privada al jugador con nota si hay.
- [ ] Rechazo de reintegro: activa cooldown de 30 días, notification con nota.
- [ ] Admin no puede auto-aprobar stats >8 para sí mismo (invariante dec-054).
- [ ] Optimistic locking: 2 devices simultáneos, el segundo recibe CONFLICT y se refresca.
- [ ] Player que sale antes de aprobar: item desaparece con toast contextual.
- [ ] Group lleno al aprobar reintegro: error con mensaje claro.
- [ ] Cronjobs cancelan orphan requests de players/groups archivados.
- [ ] Owners y non-admin no pueden ejecutar RPCs de resolución.
- [ ] Todos los tests unit, integration y RLS pasan.

---

## Fuera de alcance

- Bulk actions (*"aprobar todas las cartas nuevas de una"*). No lo necesitamos en MVP; si hay feedback, v2.1.
- Histórico de pendientes resueltos (ver "qué aprobé ayer"). Por ahora no lo mostramos; el log público de cambios ya da esa info indirectamente.
- Filtros o búsqueda dentro de `/admin-tasks`. La cantidad realista de pendientes es ≤20, no hace falta.
- Ordenamiento personalizable. Orden fijo por urgencia.
- Exportar pendientes. No aplica.
- Delegación parcial a Owners. Los Owners siguen sin tocar stats ni reintegros (invariante `dec-026` y `dec-046`).
