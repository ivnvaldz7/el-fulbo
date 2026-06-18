# Business Rules V2

Reglas que definen **cómo se comporta** El Fulbo V2. Toda lógica ambigua se resuelve acá, no en código.

---

## 1. Stats y cálculo del Overall

### 1.1 Estructura de stats

**Jugador de campo** (PRIMARY_POSITION ≠ ARQ): usa stats `PAC, SHO, PAS, DRI, DEF, PHY`.
**Arquero** (PRIMARY_POSITION = ARQ): usa stats `DIV, HAN, KIC, REF, SPD, POS`.

Valores enteros **1-10** en DB. Display UI: **1-99** (multiplicar ×10 al mostrar).

### 1.2 Pesos del overall por posición

**Jugador de campo:**

| Stat | DEF | MED | DEL |
|------|-----|-----|-----|
| PAC  | 0.10 | 0.10 | 0.25 |
| SHO  | 0.05 | 0.15 | 0.30 |
| PAS  | 0.15 | 0.25 | 0.15 |
| DRI  | 0.10 | 0.25 | 0.20 |
| DEF  | 0.35 | 0.15 | 0.03 |
| PHY  | 0.25 | 0.10 | 0.07 |
| **Total** | 1.00 | 1.00 | 1.00 |

**Arquero:**

| Stat | Peso |
|------|------|
| DIV  | 0.20 |
| HAN  | 0.25 |
| KIC  | 0.10 |
| REF  | 0.25 |
| SPD  | 0.05 |
| POS  | 0.15 |
| **Total** | 1.00 |

### 1.3 Fórmula del overall

```
overall_raw = Σ (stat_i × weight_i[position])   // rango 1.0 – 10.0
overall_display = round(overall_raw × 10)        // rango 10 – 99
overall_final = min(99, overall_display)         // clamp hard a 99
```

### 1.4 Stats principales por posición

Las 2 stats que reciben **bonus en el boost**:

| Posición | Principales |
|----------|-------------|
| DEF | DEF + PHY |
| MED | PAS + DRI |
| DEL | PAC + SHO |
| ARQ | HAN + REF |

---

## 2. Tiers de cards FIFA

Calculados a partir del `overall_actual = base_overall + boost_overall_delta`.

| Tier | Rango | Visual |
|------|-------|--------|
| Bronce | ≤ 65 | Card marrón mate |
| Plata | 66 – 75 | Card gris metalizada |
| Oro simple | 76 – 83 | Card dorada mate, sin brillo |
| Oro | ≥ 84 | Card dorada con brillo/efecto |
| **MVP** | Cualquier overall, post-partido como MVP | Card dorada con efecto especial (dorada intensa + halo) |

**Regla especial:** la card MVP persiste mientras dure el boost MVP del jugador (3 partidos). Después vuelve al tier correspondiente a su overall actual.

---

## 3. Flujo de carga inicial de stats

### 3.1 Self-assessment del jugador

Al unirse a un Group por primera vez (magic link del Admin, Google OAuth):

1. El jugador ve formulario: foto, `display_name`, `primary_position`, `secondary_position` (opcional), **6 stats 1-10**.
2. Si selecciona `primary_position = 'ARQ'`, el formulario muestra las 6 stats de arquero. Si no, las de campo.
3. Al guardar, `stats_status = 'pending_approval'`.
4. La card **no es visible para el Group**. Solo la ve el jugador y el Admin.
5. Admin recibe notificación (push + email): *"{nombre} cargó sus stats, revisá."*

### 3.2 Aprobación por el Admin

1. Admin entra al dashboard → ve banner "1 carta pendiente de aprobación".
2. Click → form del jugador con sus valores cargados + panel de ajuste para el Admin.
3. Admin ajusta lo que quiera + confirma.
4. `stats_status = 'approved'`. Se crea row en `PlayerStatChangeLog` con `requested_by_user_id = user_id del jugador` y `changed_by_user_id = admin`.
5. Carta se vuelve pública para el Group.
6. Push al jugador: *"Tu carta fue aprobada."*

### 3.3 Política de "infla las stats"

Para prevenir que los jugadores se auto-asignen valores irreales y evitar cargar trabajo de moderación al Admin, **los sliders del self-assessment tienen tope duro en 8**. El jugador no puede poner 9 ni 10. Esos valores quedan reservados:

- **9 y 10** solo pueden ser asignados por el Admin en la revisión inicial (o posteriores), si considera que el jugador lo merece.
- **También se desbloquean** vía boost temporal cuando el jugador gana partidos con MVP.

Esto convierte el oro pleno (≥84) en una recompensa aspiracional: lo reconoce el admin o se gana en la cancha. Ver `dec-043`.

---

## 4. Solicitud de revisión de stats

### 4.1 Iniciada por el jugador

1. Player entra a su carta → botón "Pedir revisión".
2. Modal: mensaje (1-200 chars) + opcionalmente proponer nuevos valores.
3. Al enviar: se crea `StatRevisionRequest` con `status='pending'`.
4. Admin recibe notificación push + email.
5. Solo puede haber **1 request pendiente por Player** en simultáneo. Si hay uno pendiente, el botón "Pedir revisión" queda disabled con mensaje informativo.

### 4.2 Resolución por el Admin

1. Admin ve notificación → abre request.
2. Puede: **aprobar tal cual lo propuesto**, **aprobar con valores distintos**, **rechazar**.
3. Si aprueba: `status='approved'`, se updatea `Player.stats`, se crea log en `PlayerStatChangeLog` que es **público en el Group** (se muestra en feed de novedades).
4. Si rechaza: `status='rejected'` con nota opcional. Jugador recibe notificación.

### 4.3 Transparencia

El log público **siempre incluye**:
- Nombre del Player.
- Quién pidió (si fue el propio jugador).
- Quién aprobó (siempre el Admin).
- Stats antes/después (valores concretos).
- Fecha.

Visible en el feed del Group para todos los miembros.

---

## 5. Sistema de boost temporal

### 5.1 Principios

- **Boost dura 3 partidos consecutivos** en los que el jugador **participa** (no días, no semanas).
- **Nunca penaliza derrota.** Solo victoria y MVP generan boost.
- **Reemplaza al Rating Interno oculto** del V1.

### 5.2 Tabla de detonantes

Se aplica después de que el Admin/Owner carga el resultado + elige MVP:

| Situación | Stats principales | Stats secundarias |
|-----------|-------------------|-------------------|
| Victoria + MVP | +3 a +5 | +1 a todas las demás |
| Victoria sin MVP | +1 a +2 | 0 |
| Empate + MVP | +1 a +2 | 0 |
| Derrota + MVP | +1 a +2 | 0 |
| Empate o derrota sin MVP | 0 | 0 |

**Fórmula concreta para "+3 a +5"**: el sistema aplica **+3 fijo** salvo que el MVP haya sido elegido unánimemente por unanimidad futura (feature v2.1). En MVP V2: siempre **+3 en principales + +1 en resto** para el MVP con victoria.

**Fórmula "+1 a +2"**: **+1 fijo** en V2. El rango es para evolución futura.

### 5.3 Decremento del boost

Cada vez que el jugador **juega** un partido (tiene `MatchParticipation` con `team != 'substitute'`):
- `current_boost.partidos_remaining -= 1`.
- Si un **nuevo boost se gana** mientras uno está activo: **se reemplaza completamente** (el nuevo boost pisa al anterior con 3 partidos frescos). No se acumulan.
- Si `partidos_remaining = 0`: `current_boost = null`.

### 5.4 Boost no afecta las stats base

Las stats base **nunca** se mutan por partidos. Solo `current_boost` se mueve. El overall se muestra como:

```
overall_display = base_overall + boost_overall_delta
```

donde `boost_overall_delta` es el overall calculado con `stats + modifiers` menos `base_overall`.

En la UI: se muestra el overall actualizado con un badge "+2" verde al lado de las stats modificadas.

### 5.5 Máximo overall con boost

Aunque el boost sume, el overall se **clampa a 99**. Un jugador base 98 + boost +3 = 99, no 101.

---

## 6. Formaciones por modalidad

| Modalidad | ARQ | DEF | MED | DEL | Total por equipo |
|-----------|-----|-----|-----|-----|-------------------|
| F5  | 1 | 1 | 2 | 1 | 5  |
| F6  | 1 | 2 | 2 | 1 | 6  |
| F7  | 1 | 2 | 3 | 1 | 7  |
| F8  | 1 | 3 | 3 | 1 | 8  |
| F9  | 1 | 3 | 3 | 2 | 9  |
| F11 | 1 | 4 | 3 | 3 | 11 |

Los cupos son **mínimos a cumplir**. Si hay jugadores en exceso, ver regla de paridad impar.

---

## 7. Algoritmo de balanceo

Ver detalle en `/specs/01-domain/balancing-algorithm.md`.

Resumen:

- **Fase 0:** validación de viabilidad. Si hay conflictos (sin arquero, cantidad impar, cupo incompleto), la app no decide: pregunta al usuario.
- **Fase 1:** satisfacción de cupos por posición. Usa MED como comodín.
- **Fase 2:** optimización greedy minimizando diff de overall total entre equipos.
- **Fase 3:** construcción del resultado con warnings.
- **Input de ratings:** `overall_actual = base + boost`. Transparente, visible.

---

## 8. Flujo del Event (ciclo del partido)

### 8.1 Creación

Admin crea Event con:
- Modalidad (obligatoria).
- Fecha + hora (obligatorias).
- Nombre de la cancha (obligatorio).
- Link de Google Maps (opcional pero recomendado).

Status inicial: `scheduled`.

Se dispara notificación push + email a **todos los Players activos del Group** con botón "Confirmar".

### 8.2 Fase de confirmación

- Jugadores marcan `going / not_going / maybe` desde la notificación o dashboard.
- Pueden cambiar su respuesta hasta el check-in.
- Admin ve dashboard en vivo con counts actualizados.
- Si alguien cambia de `going` a `not_going` **cerca de la hora** (configurable, default 6h antes), el Admin recibe notificación push: *"Juan se bajó del partido"*.

Cuando el count de `going` cubre la modalidad (ej. F8 = 16 confirmados), el status pasa a `confirming` (sin cambio funcional, es visual).

### 8.3 Check-in en cancha

Cuando llega la hora del partido, el Admin u Owner hace check-in físico desde la app:

- Ve lista de confirmados.
- Marca uno a uno: "está presente".
- Puede agregar un **player fantasma** si falta alguien.
- Los `maybe` requieren confirmación explícita.

Cuando todos están marcados: botón "Sortear" habilitado. Status del Event = `checked_in`.

### 8.4 Sorteo

- Solo juegan los `checked_in=true` + player fantasma agregados.
- Se ejecuta algoritmo de balanceo.
- Se muestra animación de sorteo (Framer Motion).
- Admin/Owner puede: confirmar, re-sortear (nuevo seed), o editar manualmente.
- Al confirmar: status = `drawn`, se crean `MatchParticipation` para cada jugador.

### 8.5 Resultado

Después del partido, Admin u Owner:
- Ingresa `team_a_score` y `team_b_score`.
- Elige MVP (1 jugador de cualquier equipo).
- Notas opcionales.
- Al confirmar: status = `played`, se aplican boosts (ver sección 5), notificaciones a todos.

### 8.6 Post-partido

- Cards de todos los jugadores se actualizan con nuevos boosts.
- Se muestra feed con resumen: score, MVP, quiénes subieron de tier.
- Si el MVP fue bien elegido según consenso futuro (feature v2.1): podría haber votación.

---

## 9. Player fantasma

### 9.1 Creación

Solo el Admin, durante check-in de un Event, puede crear un player fantasma.

1. Botón "Agregar jugador fantasma" → form.
2. Input: nombre (obligatorio).
3. Sistema crea Player con:
   - `user_id = null`
   - `display_name = <nombre>`
   - `primary_position = 'MED'` (default)
   - `stats = {pac:6, sho:6, pas:6, dri:6, def:6, phy:6}` (todas 6)
   - `stats_status = 'approved'`
   - `is_phantom = true`
   - `current_boost = null`
4. Se marca `checked_in = true` automáticamente.

### 9.2 Post-partido

7 días después del partido en el que jugó, el Admin debe decidir:

- **Convertir en real:** se envía magic link al email que el Admin ingrese. Cuando acepta, se crea User y se vincula `user_id`. `is_phantom = false`.
- **Archivar:** `archived_at = now()`. Su histórico se conserva 1 año.
- **Eliminar:** hard delete. Se conservan sus `MatchParticipation` como huérfanos (con `player_id` apuntando a un snapshot JSON del player).

Si el Admin no decide en 7 días: **archivado automático**.

---

## 10. Owners fijos

### 10.1 Designación

Admin en configuración del Group puede designar hasta 2 Owners:

- Debe ser un User que ya es Player del mismo Group.
- Admin busca por nombre, selecciona, confirma.
- Se crea `GroupMembership` con `role='owner'`.
- Notificación push + email al designado.

### 10.2 Permisos del Owner

**Puede:**
- Crear Events.
- Hacer check-in.
- Sortear.
- Cargar resultado.
- Elegir MVP.

**No puede:**
- Editar stats base.
- Aprobar solicitudes de revisión.
- Designar/remover Owners.
- Eliminar el Group.
- Transferir rol de Admin.

### 10.3 Remoción

Admin puede remover Owner en cualquier momento.

---

## 11. Owners temporales automáticos

### 11.1 Activación

Condiciones para activar:
1. Hay un Event `scheduled` cuyo `scheduled_at` está a **menos de 2 horas**.
2. El Admin **no confirmó asistencia** (su EventAttendance tiene `status != 'going'` o no existe).
3. El Group **no tiene Owners fijos** activos, o ninguno confirmó asistencia.

Si se cumplen, el sistema ejecuta:

### 11.2 Selección

1. **Primer criterio:** 2 Players con más antigüedad (`joined_at` más viejo) cuyo EventAttendance es `going`.
2. **Si no hay suficientes con antigüedad** (caso raro en grupo nuevo): al azar entre los `going`.
3. Se crean 2 rows en `TemporaryOwner` con `event_id`, `user_id`, `assigned_reason='admin_no_confirm_no_owners'`, `expires_at = scheduled_at + 24h`.

### 11.3 Confirmación requerida

- Cada Owner temporal recibe notificación push + email con mensaje claro: *"Sos Owner temporal del partido de hoy. Podés sortear y cargar resultado. ¿Confirmás?"*.
- Botones: Confirmar / Rechazar.
- Si **confirma**: se setea `confirmed_at`. Queda con poderes de Owner por 24h después del partido.
- Si **rechaza**: el sistema intenta con el **siguiente en orden de antigüedad**. Escala de a uno hasta encontrar 2 confirmados, o hasta agotar lista.
- Si **nadie confirma**: el Event queda sin sorteador. Notificación urgente al Admin: *"Nadie aceptó ser Owner temporal. El partido no se puede sortear automáticamente."*

### 11.4 Poderes

Los **mismos de Owner fijo**:
- Crear Events (sí, pueden).
- Check-in, sortear, cargar resultado, elegir MVP.
- **No editan stats. No aprueban revisiones.**

### 11.5 Expiración

`expires_at = played_at + 24h` (o `scheduled_at + 24h` si el partido nunca se jugó).

Cronjob cada hora: si `now() > expires_at`, la row se marca como expirada y los poderes se desactivan.

---

## 12. Histórico y retención de Players

### 12.1 Jugador sale voluntariamente

1. Player entra a "Salir del grupo".
2. Confirmación doble.
3. `archived_at = now()`, `is_expelled = false`.
4. Histórico (MatchParticipations, stats, logs) **se conserva**.
5. Si vuelve al Group **antes de 365 días**: se reactiva todo (un-archive). No requiere aprobación.
6. Si no vuelve en 365 días: cronjob hace **hard delete** del Player. Sus MatchParticipations se conservan con `player_id` null y snapshot JSON del player (nombre + stats finales).

### 12.2 Jugador expulsado por Admin

1. Admin en roster → botón "Expulsar".
2. Confirmación doble.
3. `archived_at = now()`, `is_expelled = true`.
4. Histórico se conserva igual.
5. Si intenta volver: requiere aprobación explícita del Admin (notification al Admin).
6. Retención: mismo ciclo de 365 días.

### 12.3 Admin se va

Si el Admin decide salir del Group:
1. Debe **transferir el rol** a otro User (un Owner, o un Player con email vinculado al User).
2. Si no transfiere y se fuerza la salida: el Group queda sin Admin → ver sección 13.

---

## 13. Grupos huérfanos

### 13.1 Detección

Un Group se considera huérfano si no tiene ningún `GroupMembership` activo con `role='admin'`.

### 13.2 Sucesión automática

1. Si hay Owners: el más antiguo se promueve a Admin (notification + email, requiere aceptación).
2. Si no hay Owners: `Group.archived_at = now()`.
3. Durante 30 días, el Group sigue accesible en read-only para todos los Players.
4. A los 30 días: hard delete del Group y toda su data.

### 13.3 Recuperación manual

Durante los 30 días, **cualquier Player del Group** puede contactar a `ivnvldz7@gmail.com` solicitando hacerse Admin. Soporte aprueba manualmente. Fuera de MVP se automatizará.

---

## 14. Notificaciones

### 14.1 Canales

1. **Web Push** (Web Push API + VAPID).
2. **Email** (Supabase SMTP).
3. **In-app badge** (Zustand store).

### 14.2 Tipos y canal por default

| Tipo | Push | Email | In-app |
|------|------|-------|--------|
| `event_created` | ✅ | ✅ | ✅ |
| `event_cancelled` | ✅ | ✅ | ✅ |
| `attendance_changed` | ❌ | ❌ | ✅ (solo Admin) |
| `someone_dropped` | ✅ | ❌ | ✅ (solo Admin) |
| `owner_temporary_assigned` | ✅ | ✅ | ✅ |
| `stats_pending_approval` | ❌ | ❌ (se incluye en digest diario) | ✅ (solo Admin, badge con contador) |
| `stats_approved` | ✅ | ❌ | ✅ |
| `stats_revision_requested` | ✅ | ✅ | ✅ (solo Admin) |
| `stats_revision_resolved` | ✅ | ❌ | ✅ |
| `stats_changed_log` | ❌ | ❌ | ✅ (todos los miembros del Group) |
| `mvp_awarded` | ✅ | ❌ | ✅ |
| `boost_applied` | ❌ | ❌ | ✅ |
| `weekly_digest` | ❌ | ✅ | ❌ |

**Nota sobre `stats_pending_approval`:** el canal es solo badge persistente en el dashboard del Admin (con contador de cartas pendientes) + digest diario por email a las 9 AM que resume *"Ayer cargaron stats Juan, Pedro y 2 más."*. No se manda push ni email individual por cada carta. Ver `dec-047`.

**Nota sobre `stats_changed_log`:** este tipo se genera cada vez que el Admin aprueba un cambio de stats (inicial o revisión). Aparece en el feed del Group **solo cuando los miembros abren la app**, sin push ni email. El objetivo es transparencia pasiva: "el que quiere ver, ve", sin generar drama social vía notificación intrusiva. Decisión tomada en `dec-037`.

**Sección pública "Esperando aprobación":** además del canal de notificación, en el dashboard del grupo hay una sección visible a TODOS los miembros que muestra qué jugadores tienen carta pendiente **solo si hay ≥1 con antigüedad ≥3 días**. Crea peer pressure sobre un Admin inactivo sin spam técnico. Ver `dec-048`.

### 14.3 Preferencias del User

Cada User puede en su perfil:
- Activar/desactivar Web Push.
- Elegir frecuencia del digest semanal (on/off).
- No puede desactivar notificaciones críticas (owner temporal).

---

## 15. Límites operativos

| Límite | Valor | Razón |
|--------|-------|-------|
| Max Players activos por Group | 50 | Evita rosters absurdos. |
| Max Owners fijos por Group | 2 | Simplifica gobernanza. |
| Max Owners temporales por Event | 2 | Coherente con fijos. |
| Max Groups como Admin por User | 3 | Foco. |
| Max Groups como Player por User | 10 | Evita spam de grupos. |
| Duración del boost | 3 partidos | Capturar racha real. |
| Tiempo para decidir sobre player fantasma | 7 días | Balance entre flexibilidad y limpieza. |
| Retención de histórico post-salida | 365 días | Permite volver sin perder progreso. |
| Retención de grupo huérfano | 30 días | Recuperación manual posible. |
| Máximo de 1 revisión pendiente por Player | 1 | Evita flood al Admin. |
| Mensaje de revisión | 200 chars | Forza claridad. |

---

## 16. Validaciones clave

- Stats siempre 1-10.
- Posición primaria distinta de secundaria.
- Arquero **debe** tener stats de arquero, no de campo (y viceversa).
- Nombre de Group y Player: 1-40 chars, trim, no vacío.
- Nombre de cancha: 1-60 chars.
- Score del partido: ≥ 0 ambos.
- MVP debe ser un Player que participó en el Event (con MatchParticipation).
- Owner temporal solo puede ser un User que confirmó asistencia al Event.
