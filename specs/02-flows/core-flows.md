# Core Flows V2

Flujos principales del ciclo del partido. Ampliar con features específicos en `/specs/03-features/`.

---

## Flow 1: Signup de un User nuevo

**Objetivo:** un usuario nuevo crea su cuenta vía Google OAuth.

1. Usuario entra a `https://elfulbo.app` (o la URL que corresponda).
2. Landing mínima con CTAs: "Crear grupo" / "Unirme a un grupo".
3. Click en cualquiera → pantalla "Iniciar sesión con Google".
4. Google OAuth → redirect a `/auth/callback`.
5. Sistema crea row en `public.users` si no existe (con `id`, `email`, `display_name`, `photo_url` de Google).
6. Si User tiene Groups → redirect a su dashboard de último Group visitado.
7. Si no tiene Groups → redirect a `/onboarding` (elegir entre crear o unirse).

---

## Flow 2: Crear un Group

**Objetivo:** User crea un Group y queda como Admin.

Precondiciones:
- User autenticado.
- User es Admin de ≤ 2 Groups (no llegó al límite de 3).

1. User entra a `/groups/new`.
2. Form:
   - Nombre del grupo (1-40 chars).
   - Modalidad por default (F5/F6/F8/F11).
   - Logo opcional (máx 2MB, compresión cliente a 512×512 WebP).
   - Link de donación opcional (Cafecito/MP link).
3. Al confirmar, sistema ejecuta atómicamente:
   - Insert en `groups` con `admin_user_id = user.id`, genera `invite_code`.
   - Insert en `group_memberships` con `role='admin'`.
   - Crea el propio Player del Admin (primary_position=MED default, stats all=6, approved).
4. Redirect a `/groups/{group_id}/dashboard` con CTAs "Invitar jugadores" y "Crear primer evento".

---

## Flow 3: Unirse a un Group

**Objetivo:** un User entra a un Group vía invitación del Admin.

Dos variantes:

### 3a: Invitación por link

1. Admin copia el link del Group: `https://elfulbo.app/invite/{invite_code}`.
2. Lo comparte por WhatsApp.
3. User abre el link → si no tiene sesión, hace signup/login (Flow 1).
4. Sistema detecta `invite_code` en URL → muestra preview del Group ("Te invitaron a {nombre}. ¿Querés unirte?").
5. User acepta → se crea Player nuevo en el Group con `stats_status='pending_approval'`, sin stats cargadas.
6. Redirect a `/groups/{id}/onboarding-stats` (Flow 4).

### 3b: Creación directa por Admin (player fantasma → real)

Ver Flow 11.

---

## Flow 4: Self-assessment + aprobación de stats

**Objetivo:** Player nuevo carga sus stats iniciales; Admin las aprueba.

### 4a: Jugador carga

1. En `/groups/{id}/onboarding-stats`:
   - Info clara: "Cargá tus stats. El admin las va a revisar antes de que tu carta sea pública."
   - Campos:
     - Foto opcional (reemplaza la de Google si la tiene).
     - Display name (prellenado con el de Google, editable).
     - Primary position (ARQ/DEF/MED/DEL).
     - Secondary position (opcional).
     - 6 stats 1-10 (si primary=ARQ, las 6 de arquero; si no, las de campo).
2. Slider por cada stat con descripción corta ("DEF: tu capacidad de quitar y marcar").
3. Al guardar: `stats_status='pending_approval'`.
4. Notificación push + email al Admin del Group: *"{nombre} cargó sus stats, revisá."*
5. Player ve su carta en modo "pendiente de aprobación" con badge visible. Solo él la ve.

### 4b: Admin aprueba

1. Admin entra al dashboard → banner "1 carta pendiente".
2. Click → form con valores cargados por el Player + panel de ajuste para el Admin.
3. Admin puede:
   - Aceptar tal cual.
   - Modificar valores antes de aprobar.
   - Rechazar (vuelve el Player a pending con mensaje).
4. Al aprobar:
   - `stats_status='approved'`.
   - Insert en `player_stat_change_log` con `before_stats = {todas 0}`, `after_stats = valores aprobados`, `requested_by_user_id = player.user_id`, `changed_by_user_id = admin.user_id`, `reason='initial_approval'`.
   - Notificación push al Player: *"Tu carta fue aprobada."*
5. Carta pasa a ser pública en el Group.

---

## Flow 5: Solicitar revisión de stats

**Objetivo:** Player pide al Admin revisar sus stats.

Precondiciones:
- Stats ya aprobadas.
- No hay otra request pendiente para este Player.

1. Player entra a su carta → botón "Pedir revisión" (si hay request pendiente, está disabled con tooltip).
2. Modal:
   - Mensaje (1-200 chars, obligatorio): *"Me sentí mejor en el ataque últimamente."*
   - Valores sugeridos (opcional): podés proponer nuevas stats.
3. Al enviar: se crea `stat_revision_request` con `status='pending'`.
4. Push + email al Admin.
5. Admin recibe, abre request, ve:
   - Stats actuales.
   - Mensaje del Player.
   - Valores propuestos (si los hay).
   - Tres botones: **Aprobar tal cual** / **Aprobar con cambios** (edita) / **Rechazar** (con nota opcional).
6. Al resolver:
   - Si aprueba: update `Player.stats`, insert en `player_stat_change_log` (público en el Group feed). Request → `status='approved'`.
   - Si rechaza: Request → `status='rejected'`.
7. Notificación al Player con resolución.

---

## Flow 6: Crear un Event (partido)

**Objetivo:** Admin u Owner crea un partido.

Actores permitidos: Admin, Owner.

1. Entra a `/groups/{id}/events/new`.
2. Form:
   - Fecha + hora (default: próximo domingo 20hs).
   - Modalidad (default: `default_modality` del Group).
   - Nombre de la cancha (1-60 chars).
   - Link de Google Maps (opcional pero recomendado).
   - Notas (opcional).
3. Al confirmar: insert en `events` con `status='scheduled'`, `created_by_user_id`.
4. Sistema dispara notificación push + email a **todos los Players activos del Group** con:
   - Datos del evento.
   - Botón "Confirmar" / "No puedo" / "Tal vez".
5. Event queda en `/groups/{id}/events/{event_id}` con lista viva de confirmados.

---

## Flow 7: Confirmar asistencia

**Objetivo:** Player responde a un Event.

1. Player recibe push o entra al Event desde dashboard.
2. Ve detalles + 3 botones grandes: "Voy" / "No voy" / "Tal vez".
3. Al seleccionar: upsert en `event_attendance` con `status` correspondiente.
4. Lista del Event se actualiza en tiempo real (vía Supabase Realtime).
5. Si el Player cambia de "voy" a "no voy" **a menos de 6h del partido**, sistema dispara notification push al Admin: *"{nombre} se bajó del partido."*

---

## Flow 8: Check-in en la cancha

**Objetivo:** Admin/Owner confirma quién está físicamente presente antes de sortear.

Precondiciones:
- Event con status `scheduled` o `confirming`.
- Usuario es Admin, Owner, u Owner temporal confirmado.

1. Admin/Owner entra al Event → botón "Hacer check-in".
2. Lista de confirmados y "tal vez" con checkboxes grandes.
3. Marca uno a uno (o "marcar todos los 'voy'" con 1 click).
4. Si falta alguien: botón "Agregar jugador fantasma" → Flow 9.
5. Cuando termina, botón "Ir a sorteo" habilitado si hay `>= team_size * 2` check-ineados.
6. Al confirmar: `event.status='checked_in'`.

---

## Flow 9: Player fantasma

**Objetivo:** Admin completa equipo con un jugador sin cuenta.

Durante check-in o antes:

1. Click "Agregar jugador fantasma".
2. Form:
   - Nombre (obligatorio).
3. Sistema crea Player con defaults (ver business-rules §9).
4. Se marca `checked_in=true` automáticamente.
5. El player fantasma juega el partido.
6. **7 días después**, en el dashboard del Admin:
   - Banner: "¿Qué hacemos con {nombre}? (jugó el {fecha})"
   - Opciones:
     - **Convertir en real:** pedir email → se envía magic link al email ingresado → al aceptar, Player pasa a tener User asociado, `is_phantom=false`.
     - **Archivar:** `archived_at=now()`.
     - **Eliminar:** hard delete.
7. Si no decide en 7 días: archivar automático.

---

## Flow 10: Sorteo

**Objetivo:** balancear los check-ineados en dos equipos.

Precondiciones: Event `checked_in` con cupo suficiente.

1. Admin/Owner entra al Event → botón "Sortear equipos".
2. Sistema valida viabilidad (ver balancing-algorithm §Fase 0):
   - Si hay problemas (sin arquero, cantidad impar, etc.), muestra opciones al usuario (no decide sola).
3. Si viable, sistema genera `draw_seed` y ejecuta algoritmo.
4. Animación de sorteo (Framer Motion): cada Player aparece con su card mini, "rueda", cae en su equipo y posición.
5. Resultado: pantalla con dos equipos + overall promedio de cada uno + diff.
6. Acciones:
   - **Confirmar** → status=`drawn`, se crean `match_participations`.
   - **Re-sortear** → nuevo seed, nueva animación.
   - **Editar manualmente** → drag-and-drop entre equipos.
   - **Compartir** → genera imagen con ambos equipos.
7. Al confirmar, push a todos los participantes con su equipo asignado.

---

## Flow 11: Cargar resultado + elegir MVP

**Objetivo:** Admin/Owner registra lo que pasó.

Precondiciones: Event `drawn`.

1. Entra al Event → "Cargar resultado".
2. Form:
   - Score Equipo A (int ≥ 0).
   - Score Equipo B (int ≥ 0).
   - **MVP:** dropdown con todos los Players que participaron.
   - Notas (opcional).
3. Al confirmar, sistema ejecuta transacción:
   - Update `event.team_a_score`, `event.team_b_score`, `event.mvp_player_id`, `event.status='played'`, `event.played_at=now()`.
   - Aplica boosts según `apply_match_outcome` (ver balancing-algorithm §Aplicación del boost).
   - Crea notifications para todos los participantes: `boost_applied` + `mvp_awarded` al MVP.
4. Muestra resumen: score, MVP, quiénes subieron de tier.

---

## Flow 12: Designar Owner

**Objetivo:** Admin asigna Owner fijo al Group.

1. Admin entra a `/groups/{id}/settings/owners`.
2. Ve Owners actuales + cupo disponible (hasta 2).
3. Click "Agregar owner" → modal:
   - Input con autocomplete de Players del Group (User-linked, no phantom).
   - Selecciona uno.
4. Al confirmar: insert en `group_memberships` con `role='owner'`.
5. Notification push + email al nuevo Owner: *"Ahora sos owner de {grupo}. Podés sortear y cargar resultados."*
6. El Owner recibe acceso a los botones correspondientes.

---

## Flow 13: Owner temporal automático

**Objetivo:** sistema designa Owners temporales si el Admin no confirmó asistencia.

Trigger: cronjob cada 15 min revisa Events `scheduled` cuya `scheduled_at` esté entre 1h y 2h de ahora.

1. Sistema verifica para cada Event:
   - Admin confirmó asistencia (`event_attendance.status='going'`) → skip.
   - Admin NO confirmó **y** hay Owners fijos con `going` → skip (ellos cubren).
   - Admin NO confirmó **y** ningún Owner con `going` → **activar designación**.
2. Designación:
   - Obtener Players con `going` ordenados por `joined_at` ASC (más antiguos primero).
   - Seleccionar los 2 primeros.
   - Insert en `temporary_owners` con `confirmed_at=null`, `expires_at=scheduled_at + 24h`.
   - Push + email urgente a los 2: *"Sos owner temporal del partido de hoy. Confirmá."*
3. Confirmación:
   - Si acepta dentro de 1h: `confirmed_at=now()`. Gana poderes.
   - Si rechaza o no confirma en 1h: sistema escala al siguiente en antigüedad.
4. Si nadie confirma después de 3 intentos:
   - Notification urgente al Admin: *"Nadie aceptó ser owner temporal. El partido está sin organizador."*
   - El partido puede sortearse manualmente si alguien toma la iniciativa (Admin reaparece).
5. Expiración:
   - Cronjob cada hora: si `now() > expires_at` y `confirmed_at IS NOT NULL`, los poderes se desactivan.

---

## Flow 14: Salir del grupo (voluntario)

**Objetivo:** Player decide irse.

1. Player entra a `/groups/{id}/settings/leave`.
2. Confirmación: "¿Seguro? Tu histórico se guarda por 1 año por si volvés."
3. Confirma → `Player.archived_at = now()`, `is_expelled = false`.
4. Redirect a `/groups/new-or-join`.
5. Si quiere volver dentro de 365 días: click en link de invitación → sistema detecta y ofrece reactivar.

---

## Flow 15: Expulsar jugador

**Objetivo:** Admin expulsa a un Player.

Actores: Admin.

1. Admin entra a roster → menu del Player → "Expulsar".
2. Confirmación doble.
3. `archived_at = now()`, `is_expelled = true`.
4. Notification al Player.
5. Si intenta volver: el link de invitación lo lleva a una pantalla "Tu vuelta requiere aprobación del admin". Se manda request.

---

## Flow 16: Transferir rol de Admin

**Objetivo:** Admin pasa el rol a otro User del Group.

Precondiciones: hay al menos 1 Owner o Player con `user_id` no null.

1. Admin entra a `/groups/{id}/settings/transfer`.
2. Ve advertencia: "Vas a perder permisos de admin."
3. Elige sucesor (Owner o Player).
4. Sistema dispara magic link al email del sucesor con `succession_token`.
5. Sucesor abre link, acepta. Transacción:
   - `group.admin_user_id = nuevo`.
   - Si sucesor era Owner: `group_membership.role='admin'`.
   - Si sucesor era Player: crear `group_membership` con `role='admin'`.
   - El anterior Admin: borrar su `group_membership` y queda como Player regular.
6. Notification a todos los Players: "{nombre} es el nuevo admin."

---

## Flow 17: Exportar datos

**Objetivo:** Admin u Owner descarga backup del Group.

1. Entra a `/groups/{id}/settings/export`.
2. Click "Generar export" → backend arma ZIP con:
   - `roster.json` y `roster.csv` (Players + stats, emails anonimizados excepto para Admin).
   - `events.json` y `events.csv` (eventos + scores + MVPs).
   - `participations.json` (detalle de quién jugó qué partido).
   - `stat_change_log.json` (historial de cambios de stats).
3. Descarga automática del ZIP.
4. Sin registro del export (no hace falta).
