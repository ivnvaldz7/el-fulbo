# feat-002 — Crear un grupo

## Objetivo

Permitir a un User crear un Group donde será Admin, con mínima fricción (solo nombre + modalidad) y asegurando que el Admin termina el onboarding con su propia carta cargada y el grupo listo para invitar jugadores.

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 2 (Crear un Group).
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §15 (Límites operativos), §16 (Validaciones).
- **Entidades:** [`entities.md`](../01-domain/entities.md) — `Group`, `GroupMembership`, `Player`.
- **Tipos:** [`types.ts`](../04-contracts/types.ts) — `CreateGroupInput`, `GroupId`.
- **Errores:** [`error-model.md`](../04-contracts/error-model.md) — `ADMIN_GROUP_LIMIT_REACHED`, `VALIDATION_ERROR`, `NETWORK_ERROR`, `STORAGE_ERROR`.
- **Schema:** [`db-schema.md`](../04-contracts/db-schema.md) — `groups`, `group_memberships`, `players`, storage bucket `group-logos`.
- **Decisiones del engram:** `dec-052` a `dec-060`.
- **Dependencia:** este feature REUTILIZA el wizard de `feat-001-onboarding-user.md` para cargar las stats del Admin.

---

## Alcance

### Incluye

- Form mínimo de creación (solo nombre + modalidad).
- Creación atómica de Group + GroupMembership + Player del Admin.
- Redirect automático al wizard de stats del Admin (stats autoaprobadas al finalizar).
- Redirect post-wizard al dashboard del grupo nuevo.
- Banner persistente en dashboard hasta que haya ≥2 Players.
- Web Share API + fallback a clipboard para compartir link de invitación.
- Settings del grupo (nombre, modalidad default, logo, donation link).
- Upload de logo con crop cuadrado centrado automático + preview.
- Validación de duplicados de nombre con modal de confirmación.
- Persistencia de draft en localStorage.

### No incluye (son otros features)

- Gestión de Owners fijos (`feat-011`).
- Expulsión de jugadores (`feat-015`, backlog).
- Transferencia de Admin (`feat-016`, backlog).
- Eliminación del grupo (`feat-017`, backlog).
- Export de datos (`feat-014`).

---

## Flujo completo

### Etapa 1 — Entrada al flow

**Precondiciones:**
- User autenticado con sesión activa.
- User es Admin de ≤ 2 Groups (no llegó al límite de 3).

**Punto de entrada:**
- Desde el dashboard vacío post-login: botón **"Creá tu primer grupo"**.
- Desde cualquier dashboard de grupo existente: menú lateral → **"+ Nuevo grupo"** (si cupo disponible).

**Ruta:** `/groups/new`

**Si el User ya es Admin de 3 Groups:**
- Al tocar el botón, no se va a `/groups/new` sino que se muestra modal:
  - *"Llegaste al máximo de 3 grupos como admin. Transferí o archivá uno para sumar este."*
  - Botón: "Ir a mis grupos" → `/dashboard` (donde puede gestionar).

### Etapa 2 — Form de creación

**UI:**

- Header con botón "Volver" a la izquierda.
- Título: **"Nuevo grupo"**.
- Subtítulo chico: *"Es rápido. Podés agregar más cosas después."*
- Form con 2 campos:
  - **Nombre del grupo**
    - Input text.
    - Placeholder: `Fulbito de los jueves`.
    - Máximo 40 caracteres, contador visible a la derecha (`0/40`).
    - Auto-trim al submit.
  - **Modalidad**
    - Dropdown (`<select>` nativo para aprovechar pickers del OS).
    - Opciones con sub-texto:
      - `F5 — 5 vs 5`
      - `F6 — 6 vs 6`
      - `F8 — 8 vs 8`
      - `F11 — 11 vs 11`
    - Default pre-seleccionado: **F5**.
- Botón grande al pie: **"Crear grupo"** (primary, siempre activo).

**Validación al tocar "Crear grupo":**

1. Si nombre vacío (después de trim): error inline bajo el input:
   - *"Ponele un nombre al grupo"*.
2. Si nombre > 40 chars: error inline:
   - *"Máximo 40 caracteres"*.
3. Si pasa validaciones: chequeo de duplicados (ver §Check de duplicados).
4. Si no hay duplicados: crear el grupo (ver §Creación atómica).

**Persistencia en localStorage:**

- Mientras el usuario escribe, guardar en `localStorage.setItem('create-group-draft', JSON.stringify({name, modality}))` (debounced 200ms).
- Al montar el form, leer draft y precargar si existe.
- Si existe draft, toast discreto: *"Retomamos el grupo que estabas creando"*.
- Al submit exitoso, limpiar.

### §Check de duplicados

Antes de crear, cliente consulta:

```ts
const existing = await supabase
  .from('groups')
  .select('id, name')
  .eq('admin_user_id', user.id)
  .is('archived_at', null);

const nameLower = name.trim().toLowerCase();
const duplicate = existing.find(g => g.name.toLowerCase() === nameLower);
```

Si hay duplicado: modal de confirmación:
- Título: *"Ya tenés un grupo con ese nombre"*
- Texto: *"Ya existe {nombre_original}. ¿Querés crear otro igual?"*
- 2 botones: **"Cambiar nombre"** (cierra modal, vuelve al form) / **"Crear igual"** (continúa al submit).

### §Creación atómica (server-side)

**RPC:** `create_group(name, modality)` (Supabase function).

```sql
create or replace function create_group(
  p_name text,
  p_modality modality
) returns uuid language plpgsql security definer as $$
declare
  new_group_id uuid;
  user_id uuid := auth.uid();
begin
  -- Check límite (trigger check_admin_group_limit también cubre esto)
  if (select count(*) from group_memberships
      where user_id = auth.uid() and role = 'admin') >= 3 then
    raise exception 'ADMIN_GROUP_LIMIT_REACHED' using errcode = '23514';
  end if;

  -- Crear grupo
  insert into groups (name, default_modality, admin_user_id)
  values (trim(p_name), p_modality, user_id)
  returning id into new_group_id;

  -- Crear membership admin
  insert into group_memberships (user_id, group_id, role)
  values (user_id, new_group_id, 'admin');

  -- Crear player del admin con stats default, status pending (se llena en wizard)
  insert into players (
    user_id, group_id, display_name, primary_position, stats_status, stats
  )
  select
    user_id,
    new_group_id,
    u.display_name,
    'MED',
    'pending_approval',
    '{"pac":5,"sho":5,"pas":5,"dri":5,"def":5,"phy":5}'::jsonb
  from public.users u where u.id = user_id;

  return new_group_id;
end;
$$;
```

**Comportamiento post-RPC:**

1. Si retorna ID exitosamente → redirect a `/groups/{id}/onboarding-stats` con query param `?as=admin`.
2. Si falla por `ADMIN_GROUP_LIMIT_REACHED` → toast + link a "Ir a mis grupos".
3. Si falla por error de red → toast: *"Problemas de conexión. Reintentá, tus datos están guardados."* + mantener draft en localStorage.
4. Si falla por error de servidor → toast: *"Algo salió mal de nuestro lado. Reintentá en unos minutos."* + mantener draft.
5. Al éxito: limpiar draft de localStorage.

### Etapa 3 — Wizard de stats del Admin

**Ruta:** `/groups/{id}/onboarding-stats?as=admin`

Esta ruta **reutiliza el wizard completo de feat-001** (ver §Paso 1 y §Paso 2 de ese feature), con las siguientes diferencias:

1. **Query param `as=admin`** cambia el copy pequeño: en vez de *"Mandar al admin"*, el botón final dice **"Crear mi carta"**.
2. **Auto-aprobación:** al enviar el wizard, en vez de setear `stats_status='pending_approval'`, se setea directamente `stats_status='approved'`. Se crea row en `player_stat_change_logs` con `changed_by_user_id = requested_by_user_id = user.id` y `reason='admin_self_creation'`.
3. **Tope de 8 se mantiene** para el Admin también. El Admin NO puede auto-asignarse 9-10. Solo los gana vía boost de partidos ganados o via edición posterior... pero ojo: incluso el Admin, editándose a sí mismo en settings de Player, respeta el tope.

**Importante:** en `feat-004-admin-approve-stats.md` se va a definir que el Admin SÍ puede editar stats de otros Players hasta 10, pero **NO puede editar las suyas propias más allá de 8**. Esto previene abuso del rol. Se documenta como invariante crítica.

4. Al completar: redirect a `/groups/{id}/dashboard`.

### Etapa 4 — Dashboard del grupo nuevo

**Ruta:** `/groups/{id}/dashboard`

**Primera visita (recién creado, 1 solo Player: el Admin):**

- Header del grupo: logo (placeholder si no tiene), nombre, modalidad default, badge "Admin".
- **Banner persistente arriba** (se mantiene hasta que haya ≥2 Players):
  - Fondo con color de atención (naranja suave o azul).
  - Texto: **"Sumá a tus jugadores"** (bold, grande).
  - Subtexto: *"Compartí este link en el grupo de WhatsApp y los que entren ya están."*
  - Código del grupo visible: `FULBO-7X2K` (copiable con 1 tap).
  - Botón grande: **"Compartir por WhatsApp"** (usa Web Share API).
- Dashboard normal debajo:
  - "Próximo partido" (vacío, con CTA "Crear primer evento").
  - "Roster" (con 1 solo Player: el Admin).
  - Otras secciones estándar.

### §Compartir link (Web Share API)

**Comportamiento del botón "Compartir por WhatsApp":**

```ts
const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
const shareData = {
  title: `Unite a ${groupName}`,
  text: `Te invité a jugar al fulbito en ${groupName}. Unite acá:`,
  url: inviteUrl,
};

if (navigator.share && navigator.canShare?.(shareData)) {
  try {
    await navigator.share(shareData);
  } catch (err) {
    // Usuario canceló el share sheet. Sin toast (comportamiento esperado).
  }
} else {
  // Fallback: copiar al clipboard
  await navigator.clipboard.writeText(inviteUrl);
  toast.success('Link copiado. Pegalo en el grupo de WhatsApp.');
}
```

**UX detail:** en mobile (iOS/Android), `navigator.share` abre el share sheet nativo con todas las apps (WhatsApp primero si está instalada). En desktop, generalmente no existe → fallback a clipboard.

**Remoción del banner:** cuando el `count(players WHERE group_id = X AND archived_at IS NULL)` llega a ≥2, el banner desaparece en el próximo render (React Query refetch).

---

## Settings del grupo

**Ruta:** `/groups/{id}/settings`

**Acceso:** ícono de engranaje (⚙) en el dashboard del grupo, arriba a la derecha. Visible solo para el Admin.

**Estructura de la pantalla:**

### Sección "Info del grupo"

- **Nombre**
  - Input editable con valor actual.
  - Mismas validaciones que al crear (1-40 chars, trim).
  - Botón "Guardar" aparece cuando hay cambios sin guardar.

- **Modalidad default**
  - Dropdown con las 4 opciones (mismo estilo que al crear).
  - Cambio libre: no afecta eventos pasados o en curso.
  - Al guardar, se actualiza `groups.default_modality`.
  - Tooltip pequeño al costado: *"Esta es la modalidad por default al crear partidos. La podés cambiar en cada partido."*

- **Logo**
  - Preview del logo actual (o placeholder si no tiene).
  - Botón "Cambiar logo" → flow de upload (ver §Upload de logo).
  - Botón "Quitar logo" (solo si hay logo actual).

- **Link de donación**
  - Input text con valor actual (o vacío).
  - Placeholder: `https://cafecito.app/tu-usuario`.
  - Validación client-side: debe ser URL válida si no está vacío.
  - Tooltip: *"Si ponés un link, los jugadores lo ven en el dashboard como 'Invitale un café al admin'."*
  - Guardado automático en `groups.donation_link`.

### Sección "Roster" (se expande en feat-011)

- Lista de Players activos + Admin.
- Por ahora solo visual. Acciones (designar Owner, expulsar) vienen en otros features.

### Sección "Peligro" (collapsed por default)

- **Transferir admin** (feat-016, backlog) — link disabled con label "Próximamente".
- **Archivar grupo** (feat-017, backlog) — link disabled con label "Próximamente".

### §Upload de logo

**Flow:**

1. Admin toca **"Cambiar logo"** → abre input file con `accept="image/*"`.
2. En mobile, muestra opciones "Tomar foto / Elegir de galería".
3. Usuario selecciona imagen.
4. **Procesamiento en cliente** (sin tocar servidor todavía):
   - Leer archivo con `FileReader`.
   - Validar tamaño: ≤ 5MB (límite antes de compresión).
   - Validar tipo: JPG / PNG / WebP. Si no es válido → toast error.
   - Cargar en `<canvas>` oculto.
   - **Crop cuadrado centrado automático**: calcular el lado más corto, cropear al centro.
   - **Resize a 512×512**.
   - **Exportar como WebP** con quality 0.85.
5. Mostrar **preview cuadrado** en un modal:
   - Imagen resultante (512×512).
   - Texto: *"¿Así está bien?"*.
   - 2 botones: **"Usar"** / **"Elegir otra"**.
6. Si "Usar":
   - Upload a Supabase Storage en `group-logos/{group_id}/logo.webp` (sobrescribe si existe).
   - Al éxito, actualizar `groups.logo_url` con la URL pública.
   - Toast: *"Logo actualizado"*.
   - Cerrar modal.
7. Si "Elegir otra": cerrar modal, volver al paso 1.

**Implementación técnica:**

```ts
async function processLogoImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const size = Math.min(img.width, img.height);
  const offsetX = (img.width - size) / 2;
  const offsetY = (img.height - size) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 512, 512);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.85);
  });
}
```

**Errores posibles:**
- Archivo > 5MB → toast *"La imagen es muy pesada. Probá con otra de menos de 5MB."*
- Formato no soportado → toast *"Tenés que subir JPG, PNG o WebP."*
- Fallo de subida → toast *"No pudimos subir el logo, probá de nuevo."* (error `STORAGE_ERROR`).

---

## Contratos de datos

### Input de create group

```ts
interface CreateGroupInput {
  name: string;
  modality: Modality;
}
```

(La versión con `logoFile` y `donationLink` del `types.ts` queda para el flow de settings post-creación.)

### Output

```ts
type CreateGroupOutput = Result<{ groupId: GroupId }, AppError>;
```

### Service

```ts
// /src/lib/services/groups.ts
async function createGroup(input: CreateGroupInput): Promise<CreateGroupOutput>;

async function updateGroupSettings(
  groupId: GroupId,
  input: Partial<{
    name: string;
    defaultModality: Modality;
    donationLink: string | null;
  }>
): Promise<Result<Group, AppError>>;

async function uploadGroupLogo(
  groupId: GroupId,
  file: File
): Promise<Result<{ url: string }, AppError>>;

async function removeGroupLogo(groupId: GroupId): Promise<Result<void, AppError>>;
```

---

## Validaciones (Zod schemas)

```ts
const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Ponele un nombre al grupo').max(40, 'Máximo 40 caracteres'),
  modality: z.enum(['F5', 'F6', 'F8', 'F11']),
});

const updateGroupSettingsSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  defaultModality: z.enum(['F5', 'F6', 'F8', 'F11']).optional(),
  donationLink: z.string().url().nullable().optional(),
});
```

---

## Edge cases resueltos

| Caso | Comportamiento |
|------|----------------|
| User con 3 Groups como Admin intenta crear el 4to | Modal preventivo antes del form: *"Llegaste al máximo..."*. Botón que lleva a dashboard. |
| User tipea nombre y se cae internet antes de submit | Draft en localStorage se mantiene. Al volver, form precargado + toast *"Retomamos..."*. |
| User llena el form, submit falla por red, recarga la página | Draft persistido. Form vuelve a aparecer con datos. |
| User crea grupo con nombre idéntico a uno existente suyo | Modal de confirmación antes del submit. Si confirma "Crear igual", se crea. |
| User cierra el browser durante el wizard de stats del Admin (después de crear el group) | El Group YA está creado (RPC atómico). El Player del Admin tiene stats default y `stats_status='pending_approval'`. Al volver, el dashboard muestra banner *"Terminá de cargar tu carta"*. Tap → al wizard. |
| User abandona el wizard de stats del Admin y nunca lo completa | El Admin queda con `stats_status='pending_approval'` y stats default. Dashboard muestra banner persistente hasta completarlo. El Admin no aparece en roster de sorteo hasta completar (consistente con regla de feat-001). |
| User crea grupo, cambia el nombre en settings inmediatamente | Se actualiza sin restricción. Check de duplicados también aplica. |
| User cambia modalidad default, hay eventos en `scheduled` sin jugar | Sin efecto: los eventos ya creados mantienen su modalidad original (snapshot). Solo eventos nuevos pre-seleccionan la nueva modalidad. |
| User sube logo gigante (>5MB) | Toast de error antes de procesar, sin tocar servidor. |
| User sube logo horizontal muy ancho | Crop automático tomando el cuadrado centrado. Ve preview. Si no le gusta, elige otra. |
| User toca "Compartir" en desktop sin Web Share API | Fallback: link copiado al clipboard con toast. |
| User remueve el logo, después lo sube de nuevo, después lo remueve | Todo funciona. Se sobrescribe el archivo en el bucket. Al remover, `groups.logo_url=null`. |
| User con draft muy viejo (semanas) abre `/groups/new` | Se precarga el draft igual (localStorage no expira). Si no lo quiere, puede limpiarlo escribiendo nuevo contenido o cerrando el form. |
| User invita a alguien al grupo recién creado, pero el Admin todavía no terminó su propio wizard | El link de invitación funciona. El nuevo Player puede aceptar y hacer su propio self-assessment. Queda pending como siempre. El Admin aprueba cuando quiera. |

---

## UI/UX específicos

### Responsive

- **Mobile:** form vertical, input nombre full-width, dropdown modalidad full-width, botón "Crear" sticky abajo.
- **Desktop:** form centrado con max-width 500px.

### Accesibilidad

- Labels asociados a inputs.
- Mensajes de error con `aria-describedby` para screen readers.
- Botón "Crear" con `aria-busy="true"` durante el submit.

### Performance

- Web Share API con `canShare()` check antes de usar (evita crashes en browsers sin soporte).
- Draft debounced a 200ms.
- Imagen del logo procesada en Web Worker si el tamaño original es muy grande (optimización v2.1, no MVP).

---

## Tests obligatorios

### Unit

- `src/lib/services/groups.test.ts`:
  - `createGroup` happy path.
  - `createGroup` con nombre vacío → `VALIDATION_ERROR`.
  - `createGroup` con nombre > 40 chars → `VALIDATION_ERROR`.
  - `createGroup` con 3er Group existente → `ADMIN_GROUP_LIMIT_REACHED`.
  - `updateGroupSettings` solo actualiza los campos pasados.
  - `uploadGroupLogo` devuelve URL válida.
  - `uploadGroupLogo` con archivo > 5MB → error pre-procesamiento.

- `src/lib/images/processLogoImage.test.ts`:
  - Imagen cuadrada 1000×1000 → resultado 512×512.
  - Imagen horizontal 1600×800 → resultado 512×512 con crop centrado.
  - Imagen vertical 800×1600 → resultado 512×512 con crop centrado.

- `src/components/create-group/__tests__/CreateGroupForm.test.tsx`:
  - Botón "Crear" está activo incluso con form vacío.
  - Toca "Crear" con nombre vacío → error inline.
  - Draft se persiste al tipear.
  - Draft se precarga al montar.

### Integration

- `tests/integration/create-group-flow.test.ts`:
  - User crea group exitosamente: Group + GroupMembership (admin) + Player creados atómicamente.
  - User con 3 Groups intenta crear el 4to → error.
  - Nombre duplicado muestra modal (simulado).
  - Upload de logo termina en el bucket con URL pública accesible.
  - Update de `default_modality` no afecta events existentes.

### RLS

- `tests/integration/rls.test.ts` (sección groups):
  - User puede INSERT en `groups` si no llegó al límite de 3 admins.
  - User NO puede UPDATE `groups` de otro User (RLS policy `groups_update_admin`).
  - User NO puede INSERT en `group_memberships` con `role='admin'` para otro user_id.

---

## Copy (textos) — versión final argentino coloquial

- Entrada: *"Creá tu primer grupo"* (dashboard vacío) / *"+ Nuevo grupo"* (menú).
- Modal de límite: *"Llegaste al máximo de 3 grupos como admin. Transferí o archivá uno para sumar este."*
- Título form: *"Nuevo grupo"*.
- Subtítulo form: *"Es rápido. Podés agregar más cosas después."*
- Label nombre: *"Nombre del grupo"*.
- Placeholder: `Fulbito de los jueves`.
- Label modalidad: *"Modalidad"*.
- Opciones modalidad: `F5 — 5 vs 5`, `F6 — 6 vs 6`, `F8 — 8 vs 8`, `F11 — 11 vs 11`.
- Error nombre vacío: *"Ponele un nombre al grupo"*.
- Error nombre largo: *"Máximo 40 caracteres"*.
- Botón crear: *"Crear grupo"*.
- Modal duplicados título: *"Ya tenés un grupo con ese nombre"*.
- Modal duplicados texto: *"Ya existe '{nombre}'. ¿Querés crear otro igual?"*.
- Modal duplicados botones: *"Cambiar nombre"* / *"Crear igual"*.
- Toast retomo draft: *"Retomamos el grupo que estabas creando"*.
- Error de red: *"Problemas de conexión. Reintentá, tus datos están guardados."*
- Error de servidor: *"Algo salió mal de nuestro lado. Reintentá en unos minutos."*
- Botón wizard Admin: *"Crear mi carta"* (en vez de "Mandar al admin").
- Banner dashboard título: *"Sumá a tus jugadores"*.
- Banner dashboard sub: *"Compartí este link en el grupo de WhatsApp y los que entren ya están."*
- Botón share: *"Compartir por WhatsApp"*.
- Toast clipboard fallback: *"Link copiado. Pegalo en el grupo de WhatsApp."*
- Texto compartir (share sheet): *"Te invité a jugar al fulbito en {nombre}. Unite acá:"*.
- Settings título: *"Configuración del grupo"*.
- Settings secciones: *"Info del grupo"* / *"Roster"* / *"Peligro"*.
- Tooltip modalidad: *"Esta es la modalidad por default al crear partidos. La podés cambiar en cada partido."*
- Tooltip donación: *"Si ponés un link, los jugadores lo ven en el dashboard como 'Invitale un café al admin'."*
- Logo preview: *"¿Así está bien?"*.
- Logo preview botones: *"Usar"* / *"Elegir otra"*.
- Logo toast éxito: *"Logo actualizado"*.
- Logo error tamaño: *"La imagen es muy pesada. Probá con otra de menos de 5MB."*
- Logo error formato: *"Tenés que subir JPG, PNG o WebP."*
- Logo error upload: *"No pudimos subir el logo, probá de nuevo."*

---

## Criterios de aceptación (Auditor checklist)

- [ ] User puede acceder a `/groups/new` desde dashboard vacío y desde menú de grupo existente.
- [ ] User con 3 Groups como Admin no puede entrar a `/groups/new` (modal preventivo).
- [ ] Form precarga default F5 en modalidad.
- [ ] Botón "Crear" está siempre activo (no disabled).
- [ ] Error inline aparece debajo del campo correspondiente al tocar "Crear" con datos inválidos.
- [ ] Nombre con espacios al principio/fin se trimmea al submit.
- [ ] Duplicado de nombre muestra modal de confirmación.
- [ ] Modal "Crear igual" crea el grupo sin problemas.
- [ ] Draft se persiste en localStorage al tipear (debounced).
- [ ] Draft se precarga + toast al retomar.
- [ ] Draft se limpia al submit exitoso.
- [ ] Submit exitoso crea atómicamente: Group + GroupMembership(admin) + Player(admin con pending_approval).
- [ ] Post-submit redirect a `/groups/{id}/onboarding-stats?as=admin`.
- [ ] Wizard del Admin autoaprueba stats al terminar (stats_status='approved').
- [ ] Wizard del Admin respeta tope de 8 (no puede auto-asignar 9-10).
- [ ] Post-wizard redirect a `/groups/{id}/dashboard`.
- [ ] Dashboard muestra banner "Sumá jugadores" mientras Players < 2.
- [ ] Banner desaparece automáticamente cuando Players >= 2.
- [ ] Botón compartir usa Web Share API si disponible, fallback a clipboard.
- [ ] Settings accesible solo para Admin (Owners no ven el ícono).
- [ ] Settings permite editar nombre/modalidad/donación/logo.
- [ ] Cambio de modalidad default NO afecta events existentes.
- [ ] Upload de logo: imagen > 5MB rechaza con toast.
- [ ] Upload de logo: formato no soportado rechaza con toast.
- [ ] Upload de logo: crop centrado 512×512 WebP.
- [ ] Upload de logo: preview confirmable antes de guardar.
- [ ] Remover logo: setea `groups.logo_url = null`.
- [ ] Todos los tests unit, integration y RLS pasan.
- [ ] Copy final en español argentino, sin slang ni formalismo.

---

## Fuera de alcance

- Tour guiado post-creación. No hay tour; la app se entiende sola.
- Sugerencias de nombres basadas en IA u otros grupos. Fuera de MVP.
- Edición colaborativa (varios Admins). Actualmente 1 Admin por Group.
- Personalización de colores del grupo. Evaluación para v2.1 si los usuarios lo piden.
- Grupos públicos / descubribles. El modelo es invitación cerrada.
- Plantillas de configuración. Lo mínimo del form es tan mínimo que una plantilla no aporta.
