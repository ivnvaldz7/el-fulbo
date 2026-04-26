# feat-005 — Crear un evento (partido)

## Objetivo

Permitir al Admin (u Owner) crear un partido con fecha, hora, cancha y link a Maps, en el mínimo tiempo posible. Una vez creado, los Players del grupo lo ven en su dashboard y reciben invitación para confirmar asistencia.

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 6 (Crear un Event).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §6 (Formaciones), §8 (Ciclo del Event), §16 (Validaciones).
- **Entidades:** [`entities.md`](../01-domain/entities.md) — `Event`, `Group`.
- **Tipos:** [`types.ts`](../04-contracts/types.ts) — `Event`, `EventStatus`, `Modality`, `CreateEventInput`.
- **Errores:** [`error-model.md`](../04-contracts/error-model.md) — `VALIDATION_ERROR`, `FORBIDDEN`, `NETWORK_ERROR`.
- **Schema:** [`db-schema.md`](../04-contracts/db-schema.md) — `events`.
- **Decisiones del engram:** `dec-088` a `dec-095`.

---

## Alcance

### Incluye

- Form de creación de Event por Admin u Owner.
- Pre-carga inteligente de valores (modalidad default del Group, fecha sugerida).
- Validación de datos obligatorios y opcionales.
- Link a Maps opcional pero recomendado.
- Persistencia de draft en localStorage.
- Dispatch de notificaciones a Players del Group al crear.
- Permitir múltiples eventos el mismo día.
- Dashboard con "próximo partido" destacado + lista de próximos.
- Edición de evento antes de status `checked_in`.
- Cancelación de evento con aviso a confirmados.

### No incluye

- Confirmación de asistencia (`feat-006`).
- Check-in físico en la cancha (`feat-007`).
- Sorteo (`feat-007`).
- Carga de resultado (`feat-008`).
- Recurring events / series de partidos fijos (se considera para v2.1 si hay demanda).

---

## Flujo completo

### Etapa 1 — Entrada

**Punto de entrada principal:** dashboard del Group.

**UI del dashboard relevante:**

- Si hay un Event futuro (status `scheduled`, `confirming` o `checked_in`): se ve como "próximo partido" destacado arriba con fecha, hora, cancha, count de confirmados.
- Si no hay eventos futuros y el User es Admin u Owner: botón grande **"Crear partido"**.
- Si no hay eventos y el User es Player regular: mensaje *"Todavía no hay partidos programados."*.

**Punto de entrada secundario:** sección "Partidos" del menú del grupo → lista de eventos con botón "Crear partido" arriba (solo Admin/Owner).

**Ruta:** `/groups/{id}/events/new`.

**Permisos:** Admin, Owner fijo, Owner temporal confirmado.

### Etapa 2 — Form

**UI:**

- Header con botón "Volver" y título *"Nuevo partido"*.
- Subtítulo: *"Creá el partido y los jugadores reciben la invitación."*
- Form vertical:

  **1. Fecha**
  - Picker nativo (`<input type="date">`).
  - Default: próximo sábado si hoy es lunes a viernes. Si hoy es sábado o domingo: el próximo sábado.
  - Rango permitido: desde hoy hasta +90 días.

  **2. Hora**
  - Picker nativo (`<input type="time">`).
  - Default: `20:00` (horario más común en Argentina para fulbito).
  - Rango permitido: cualquier hora.

  **3. Modalidad**
  - Dropdown con sub-texto (`F5 — 5 vs 5`, etc.).
  - Default: `default_modality` del Group.

  **4. Nombre de la cancha**
  - Input text.
  - Placeholder: `Ej: La Boquita, Cancha 3`.
  - Validación: 1-60 chars, trim.

  **5. Link de Google Maps (opcional pero recomendado)**
  - Input text.
  - Placeholder: `https://maps.app.goo.gl/...`.
  - Validación: si hay contenido, debe ser URL válida.
  - Tooltip chico: *"Pegá el link de Maps de la cancha. Los jugadores lo van a poder tocar para llegar."*

  **6. Notas (opcional)**
  - Textarea corta (max 200 chars, contador visible).
  - Placeholder: `Algo que quieras aclarar: llevar pechera, hora de llegada, etc.`.

- Botón grande al pie: **"Crear partido"** (siempre activo).

**Persistencia localStorage:**
- Key: `event-draft-{group_id}`.
- Se guarda debounced (200ms).
- Se precarga al montar si existe.
- Se limpia al submit exitoso.
- Toast al retomar: *"Retomamos el partido que estabas creando"*.

**Validación al tocar "Crear partido":**

1. `fieldName` vacío → error inline: *"Ponele un nombre a la cancha"*.
2. `scheduledAt` en el pasado (con tolerancia de -1h para "crear un partido que empezó hace poco") → error: *"No se puede crear un partido en el pasado"*.
3. `scheduledAt` > +90 días → error: *"La fecha es demasiado lejana. Como máximo 3 meses"*.
4. `fieldMapsUrl` si hay contenido y no es URL válida → error: *"Ese link no parece válido"*.
5. Si todo OK, ejecutar RPC `create_event`.

### Etapa 3 — Creación

**RPC:**

```sql
create or replace function create_event(
  p_group_id uuid,
  p_modality modality,
  p_field_name text,
  p_field_maps_url text,
  p_scheduled_at timestamptz,
  p_notes text default null
) returns uuid language plpgsql security definer as $$
declare
  new_event_id uuid;
begin
  -- Validar permisos (admin u owner)
  if not (is_group_admin(p_group_id) or is_group_owner(p_group_id)) then
    raise exception 'FORBIDDEN';
  end if;

  -- Validar fecha (tolerancia -1h por si admin crea partido que arrancó hace poco)
  if p_scheduled_at < now() - interval '1 hour' then
    raise exception 'VALIDATION_ERROR: fecha en el pasado';
  end if;
  if p_scheduled_at > now() + interval '90 days' then
    raise exception 'VALIDATION_ERROR: fecha demasiado lejana';
  end if;

  -- Insert
  insert into public.events (
    group_id, modality, field_name, field_maps_url, scheduled_at, notes,
    created_by_user_id, status
  ) values (
    p_group_id, p_modality, trim(p_field_name), p_field_maps_url, p_scheduled_at, trim(p_notes),
    auth.uid(), 'scheduled'
  ) returning id into new_event_id;

  -- Crear notifications para todos los Players activos del Group
  insert into public.notifications (user_id, type, payload)
  select
    p.user_id,
    'event_created',
    jsonb_build_object(
      'event_id', new_event_id,
      'group_id', p_group_id,
      'scheduled_at', p_scheduled_at,
      'field_name', p_field_name
    )
  from public.players p
  where p.group_id = p_group_id
  and p.archived_at is null
  and p.user_id is not null
  and p.stats_status = 'approved';  -- solo notificar a los que tienen carta aprobada

  return new_event_id;
end;
$$;
```

**Comportamiento post-RPC:**

1. Si éxito → redirect a `/groups/{id}/events/{event_id}` (página del evento recién creado).
2. Si falla por red → toast y mantener draft.
3. Si falla por permisos → toast de error FORBIDDEN.

### Etapa 4 — Página del Event

**Ruta:** `/groups/{id}/events/{event_id}`

Al aterrizar después de crear (y en visitas posteriores):

**UI:**

- Header con título grande: *"Partido del {fecha corta}"* (ej: *"Partido del sábado 26"*).
- Card principal con:
  - Fecha completa: *"Sábado 26 de abril"*.
  - Hora: *"20:00"*.
  - Cancha: *"La Boquita"*.
  - Link "Abrir en Maps" si hay `field_maps_url`.
  - Modalidad badge: `F5`.
  - Notas (si hay).
- **Sección de asistencia** (va en detalle en `feat-006`):
  - Contadores: *"Confirmados: 3/10"*, *"No van: 1"*, *"Tal vez: 2"*.
  - Lista de nombres bajo cada categoría.
- **Botones del admin/owner** (solo visible para ellos):
  - *"Editar partido"* (si status == `scheduled` o `confirming`).
  - *"Cancelar partido"*.
  - *"Hacer check-in"* (si status == `checked_in` o cuando `scheduled_at` está próximo).
- **Botones del jugador** (si es Player del grupo):
  - Se cubren en `feat-006`.

### Etapa 5 — Edición del evento

**Ruta:** `/groups/{id}/events/{event_id}/edit`

**Permisos:** Admin u Owner, solo si `status` ∈ {`scheduled`, `confirming`}.

**UI:**

- Mismo form que creación, precargado con valores actuales.
- Botón **"Guardar cambios"** al pie.
- Link secundario: *"Cancelar"* → vuelve al evento sin guardar.

**Comportamiento al guardar:**

- RPC `update_event(event_id, ...)` actualiza solo campos cambiados.
- **Si cambió fecha u hora**: se crea notification `event_rescheduled` a todos los confirmados (`attendance_status='going'` o `'maybe'`).
- **Si solo cambió nombre de cancha o notas**: notification `event_updated` in-app only, sin push.
- Redirect a `/groups/{id}/events/{event_id}` con toast *"Partido actualizado"*.

**Edge case:** si el partido ya pasó a `checked_in` (alguien hizo check-in), el botón "Editar" desaparece. Mostrar mensaje: *"Este partido ya arrancó el check-in. No se puede editar."*

### Etapa 6 — Cancelación del evento

**Permisos:** Admin u Owner. Disponible mientras `status` ≠ `played`.

**Flujo:**

1. Tap en *"Cancelar partido"* → modal:
   - Título: *"¿Cancelar el partido?"*
   - Texto: *"Los jugadores que confirmaron van a recibir un aviso."*
   - Textarea opcional: *"Motivo (opcional)"* (hasta 200 chars).
   - Botones: *"No"* / *"Sí, cancelar"*.

2. Al confirmar:
   - `UPDATE events SET status='cancelled'`.
   - Notifications `event_cancelled` a todos los Players del Group (push + email + in-app) con motivo si hay.
   - Redirect a `/groups/{id}/dashboard` con toast *"Partido cancelado"*.

**Eventos cancelados:**
- Siguen apareciendo en el histórico del grupo (no se eliminan).
- Se muestran con label visual "Cancelado" en la lista de partidos.
- No se puede volver a activar un partido cancelado. Si querés jugar ese día, creás uno nuevo.

---

## Soporte de múltiples eventos el mismo día

**Decisión:** sin restricción de unicidad. Admin puede crear F5 a las 15:00 y F8 a las 21:00 del mismo día, ambos se manejan independientemente.

**Impacto en UX:**

- Dashboard del grupo muestra "próximo partido" = el más cercano a ahora.
- Si hay 2 eventos el mismo día, abajo del "próximo" hay un separador *"Más partidos hoy (1)"* con el siguiente.
- Cada Player confirma asistencia a cada Event de forma independiente.
- Cada Event tiene su roster, su sorteo, su resultado.

**No-features:**
- No se asume que los players son los mismos en ambos eventos.
- No se sugieren "combos" ni se relacionan los eventos entre sí.
- Cada Event es una entidad cerrada e independiente.

---

## Contratos de datos

### Input de creación

```ts
interface CreateEventInput {
  groupId: GroupId;
  modality: Modality;
  fieldName: string;
  fieldMapsUrl: string | null;
  scheduledAt: string;  // ISO datetime
  notes: string | null;
}
```

### Output

```ts
type CreateEventOutput = Result<{ eventId: EventId }, AppError>;
```

### Services

```ts
async function createEvent(input: CreateEventInput): Promise<CreateEventOutput>;

async function updateEvent(
  eventId: EventId,
  input: Partial<Omit<CreateEventInput, 'groupId'>>
): Promise<Result<Event, AppError>>;

async function cancelEvent(
  eventId: EventId,
  motiveOptional: string | null
): Promise<Result<void, AppError>>;
```

### Notification types (nuevos o existentes)

| Tipo | Push | Email | In-app |
|------|------|-------|--------|
| `event_created` | ✅ | ✅ | ✅ |
| `event_rescheduled` | ✅ | ✅ | ✅ |
| `event_updated` | ❌ | ❌ | ✅ |
| `event_cancelled` | ✅ | ✅ | ✅ |

---

## Validaciones (Zod schemas)

```ts
const createEventSchema = z.object({
  groupId: z.string().uuid(),
  modality: z.enum(['F5', 'F6', 'F8', 'F11']),
  fieldName: z.string().trim().min(1).max(60),
  fieldMapsUrl: z.string().url().nullable(),
  scheduledAt: z.string().datetime(),
  notes: z.string().trim().max(200).nullable(),
}).refine(
  (data) => new Date(data.scheduledAt) >= new Date(Date.now() - 3600 * 1000),
  { message: 'No se puede crear un partido en el pasado' }
).refine(
  (data) => new Date(data.scheduledAt) <= new Date(Date.now() + 90 * 86400 * 1000),
  { message: 'La fecha es demasiado lejana. Como máximo 3 meses' }
);
```

---

## Edge cases resueltos

| Caso | Comportamiento |
|------|----------------|
| Admin crea evento con fecha exactamente igual a otro existente | Permitido. Dashboard muestra ambos ordenados por hora. |
| Admin modifica fecha a una anterior (ej: partido era sábado, lo cambia a viernes) | Permitido si no pasó a `checked_in`. Notifica a confirmados con `event_rescheduled`. |
| Admin cancela evento, después quiere volver a activar | No se puede revivir un cancelado. Crear uno nuevo. |
| Owner crea evento pero después el Admin lo edita | Permitido, ambos tienen permisos. |
| Owner temporal confirmado crea evento | Permitido durante la ventana de 24h post-partido. |
| Owner temporal no confirmado intenta crear evento | `FORBIDDEN`. |
| Owner tipea URL de Maps rara (no-google-maps) | Se valida solo formato URL, no dominio. Si el link es roto, es responsabilidad del admin. |
| Admin intenta crear evento para grupo archivado | RPC valida grupo activo, `FORBIDDEN`. |
| Admin eliminado mientras está creando evento (sesión stale) | RPC retorna `UNAUTHORIZED`. Frontend redirecciona a login. |
| Dos admins (tras transferencia) simultáneos crean evento | Ambos se crean. Cada uno tiene su ID único. |
| Admin cancela evento, Player todavía no había confirmado | Recibe notification `event_cancelled` igual. |
| Player lee la notification de evento creado 3 días tarde (PWA cerrada) | Badge in-app lo recibe al abrir la app. |

---

## UI/UX específicos

### Responsive

- **Mobile:** form vertical full-width. Botones sticky abajo.
- **Desktop:** form centrado max-width 500px.

### Patrones

- Pickers nativos de date/time para aprovechar UX del sistema operativo.
- `<details>`/`<summary>` para las notas (empieza colapsado).
- Preview en vivo: a medida que el admin escribe, un card chico abajo muestra cómo se va a ver la info del partido.

### Accesibilidad

- Labels asociadas, `aria-describedby` para errores.
- Anuncio por screen reader cuando se crea el evento.

---

## Tests obligatorios

### Unit

- `src/lib/services/events.test.ts`:
  - `createEvent` happy path.
  - Fecha pasado + 2h → error (tolerancia 1h).
  - Fecha +100 días → error.
  - Nombre de cancha vacío → error.
  - URL de Maps mal formada → error.
  - `updateEvent` solo actualiza campos pasados.
  - `cancelEvent` cambia status y dispara notifications.

### Integration

- `tests/integration/create-event-flow.test.ts`:
  - Admin crea evento → notifications a todos los Players con carta aprobada.
  - Players con carta pending NO reciben notifications (consistencia con dec-042).
  - Owner crea evento → permitido.
  - Player regular intenta crear → `FORBIDDEN`.
  - Cancelación → todos los confirmados reciben notification con motivo.

### RLS

- Solo miembros del grupo ven el evento.
- Solo Admin u Owner pueden UPDATE o soft-cancel.

---

## Copy (argentino coloquial)

- Botón entrada: *"Crear partido"*
- Header form: *"Nuevo partido"*
- Subtítulo form: *"Creá el partido y los jugadores reciben la invitación."*
- Labels: *"Fecha"*, *"Hora"*, *"Modalidad"*, *"Cancha"*, *"Link de Maps (opcional)"*, *"Notas (opcional)"*
- Placeholder cancha: `Ej: La Boquita, Cancha 3`
- Placeholder Maps: `https://maps.app.goo.gl/...`
- Tooltip Maps: *"Pegá el link de Maps de la cancha. Los jugadores lo van a poder tocar para llegar."*
- Placeholder notas: `Algo que quieras aclarar: llevar pechera, hora de llegada, etc.`
- Botón submit: *"Crear partido"*
- Botón editar: *"Editar partido"*
- Botón cancelar: *"Cancelar partido"*
- Error fecha pasada: *"No se puede crear un partido en el pasado"*
- Error fecha lejana: *"La fecha es demasiado lejana. Como máximo 3 meses"*
- Error cancha vacía: *"Ponele un nombre a la cancha"*
- Error Maps: *"Ese link no parece válido"*
- Toast creación: *"Partido creado"*
- Toast edición: *"Partido actualizado"*
- Toast cancelación: *"Partido cancelado"*
- Toast retomo draft: *"Retomamos el partido que estabas creando"*
- Modal cancelar título: *"¿Cancelar el partido?"*
- Modal cancelar texto: *"Los jugadores que confirmaron van a recibir un aviso."*
- Modal cancelar placeholder motivo: *"Motivo (opcional)"*
- Modal cancelar botones: *"No"* / *"Sí, cancelar"*
- Mensaje no-editable: *"Este partido ya arrancó el check-in. No se puede editar."*

---

## Criterios de aceptación

- [ ] Admin y Owner pueden crear eventos, Player regular no.
- [ ] Default fecha = próximo sábado, hora = 20:00, modalidad = default del Group.
- [ ] Tope 90 días hacia el futuro, tolerancia -1h hacia el pasado.
- [ ] Validaciones client + server.
- [ ] Draft en localStorage.
- [ ] Creación dispara notifications a Players con carta aprobada.
- [ ] Players con carta pending NO reciben notification de evento.
- [ ] Múltiples eventos mismo día son permitidos.
- [ ] Edición permite cambios solo hasta status `checked_in`.
- [ ] Cambio de fecha/hora dispara `event_rescheduled`.
- [ ] Cancelación soft-deletea (status='cancelled') y notifica con motivo opcional.
- [ ] Events cancelados siguen en histórico pero no se reviven.
- [ ] Tests unit, integration, RLS pasan.
