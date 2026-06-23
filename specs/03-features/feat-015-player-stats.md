# feat-015 — Stats individuales del jugador

## Objetivo

Permitir a cada Player y a los miembros del grupo ver las estadísticas agregadas de cualquier jugador del grupo: partidos jugados, resultados, MVPs, asistencia. Sin rankings ni gráficos (eso es v2.1). Solo los contadores esenciales para MVP.

---

## Referencias

- **Flows:** acceso desde la carta del Player.
- **Reglas:** [`business-rules.md`](../01-domain/business-rules.md) §17 (Stats agregados).
- **Entidades:** [`entities.md`](../01-domain/entities.md) — `PlayerStatsAggregate`.
- **Tipos:** [`types.ts`](../04-contracts/types.ts) — `PlayerStatsAggregate`.
- **Schema:** [`db-schema.md`](../04-contracts/db-schema.md) — VIEW `player_stats_aggregate`.
- **Decisiones del engram:** `dec-141` a `dec-144`, `dec-145` (stats rejection cycle).

---

## Alcance

### Incluye

- Pantalla de stats agregadas accesible desde la carta del Player.
- VIEW `player_stats_aggregate` en Postgres (calculada on-the-fly).
- Contadores en MVP: jugados, ganados, empatados, perdidos, MVPs, asistencia %, ghostings.
- Visibilidad pública: todos los miembros del grupo ven las stats de todos.
- Fallback "Sin datos" si el jugador es nuevo (<1 partido jugado).

### No incluye (va a v2.1)

- Rankings del grupo (top MVPs, mejor asistencia, etc.).
- Gráficos de evolución (overall a lo largo del tiempo).
- Comparaciones 1 vs 1.
- Stats por posición (goles como DEL, atajadas como ARQ).
- Achievements o logros.
- Filtros por rango de fechas.
- Export específico de stats.

---

## Flujo

### Etapa 1 — Acceso a las stats

**Desde la carta del Player:**

Ruta: `/groups/{id}/players/{player_id}`

Este es el "perfil del Player en el grupo" (no existía como feature aparte, lo creamos ahora implícitamente). Muestra:

- Card FIFA del jugador (overall, tier, stats, boost).
- Botón o link **"Ver estadísticas"** → lleva a `/groups/{id}/players/{player_id}/stats`.

**Alternativa:** tab adentro de la misma pantalla del perfil con 2 tabs: `Carta` / `Estadísticas`.

**Decisión preliminar:** tabs dentro del perfil. Menos navegación, más contextual.

### Etapa 2 — Pantalla de stats

**Ruta:** `/groups/{id}/players/{player_id}/stats` (o tab en el perfil).

**UI:**

- Header con nombre del player y foto chica (contexto).
- Grid de contadores en cards:

  **Partidos**
  - Jugados: `N`
  - Ganados: `N`
  - Empatados: `N`
  - Perdidos: `N`
  - % Victorias: `N%` (calculado sobre partidos con resultado)

  **Reconocimientos**
  - Veces MVP: `N`
  - Último MVP: *"Hace 2 semanas"* (si aplica) / *"—"*

  **Participación**
  - Asistencia: `N%`
  - Últimos 30 días: `N/M partidos`
  - Bajas tardías: `N` *(veces que se dio de baja con menos de 6h antes del partido)*

- Al pie, link *"Ver historial de partidos"* → lleva a `/groups/{id}/players/{player_id}/matches` (fuera del alcance de MVP; feature futura).

**Si el Player tiene 0 partidos jugados (jugador nuevo):**

- Mostrar mensaje: *"Todavía no jugaste ningún partido en este grupo. Las estadísticas aparecen cuando juegues tu primero."*
- Contadores ocultos o en `—`.

### Etapa 3 — Cálculo de las stats

**VIEW Postgres `player_stats_aggregate`:**

```sql
create or replace view public.player_stats_aggregate as
select
  p.id as player_id,
  p.group_id,
  p.user_id,
  p.display_name,
  -- Partidos jugados (team A o B, no substitute)
  count(distinct mp.event_id) filter (
    where mp.team in ('A', 'B') and e.status = 'played'
  ) as matches_played,
  -- Victorias
  count(distinct mp.event_id) filter (
    where mp.team = 'A' and e.status = 'played' and e.team_a_score > e.team_b_score
     or mp.team = 'B' and e.status = 'played' and e.team_b_score > e.team_a_score
  ) as wins,
  -- Empates
  count(distinct mp.event_id) filter (
    where mp.team in ('A', 'B') and e.status = 'played' and e.team_a_score = e.team_b_score
  ) as draws,
  -- Derrotas
  count(distinct mp.event_id) filter (
    where mp.team = 'A' and e.status = 'played' and e.team_a_score < e.team_b_score
     or mp.team = 'B' and e.status = 'played' and e.team_b_score < e.team_a_score
  ) as losses,
  -- Veces MVP
  count(distinct e.id) filter (
    where e.mvp_player_id = p.id and e.status = 'played'
  ) as mvp_count,
  -- Último MVP
  max(e.played_at) filter (
    where e.mvp_player_id = p.id and e.status = 'played'
  ) as last_mvp_at,
  -- Asistencia: partidos jugados / partidos del grupo desde que se unió
  case
    when (select count(*) from public.events e2
          where e2.group_id = p.group_id
          and e2.status = 'played'
          and e2.played_at >= p.joined_at) > 0
    then round(
      100.0 * count(distinct mp.event_id) filter (
        where mp.team in ('A', 'B') and e.status = 'played'
      ) / (select count(*) from public.events e2
           where e2.group_id = p.group_id
           and e2.status = 'played'
           and e2.played_at >= p.joined_at)
    , 1)
    else null
  end as attendance_rate,
  -- Bajas tardías (<6h antes del partido, ver dec-096)
  (select count(*) from public.event_attendances ea
   join public.events ev on ev.id = ea.event_id
   where ea.player_id = p.id
   and ea.status = 'not_going'
   and ea.updated_at > (ev.scheduled_at - interval '6 hours')
  ) as late_dropouts
from public.players p
left join public.match_participations mp on mp.player_id = p.id
left join public.events e on e.id = mp.event_id and e.status = 'played'
where p.archived_at is null
group by p.id, p.group_id, p.user_id, p.display_name, p.joined_at;
```

**Nota:** esta VIEW se calcula on-the-fly en cada query. Si hay issues de performance con grupos grandes (>1000 partidos), se puede convertir a `MATERIALIZED VIEW` refrescada post-`load_match_result`.

**Retornar al cliente:**

```ts
async function fetchPlayerStats(playerId: PlayerId): Promise<PlayerStatsAggregate> {
  const { data, error } = await supabase
    .from('player_stats_aggregate')
    .select('*')
    .eq('player_id', playerId)
    .single();
  // ...
}
```

### Etapa 4 — Actualización en tiempo real

**Cuándo se actualizan las stats:**

- Después de `load_match_result` (feat-008): la VIEW refleja los nuevos datos inmediatamente (es una view, no requiere refresh).
- Después de `update_attendance` (feat-006): las bajas tardías se actualizan.

**No hay triggers ni cronjobs adicionales.** La VIEW es siempre consistente con la data base.

### Etapa 5 — Ciclo de rechazo de carta inicial

El Admin puede rechazar la carta que un jugador propuso durante el onboarding, cerrando el ciclo para que el jugador pueda corregir y re-enviar.

**Flujo:**

1. **Player** carga sus stats iniciales → `stats_status = 'pending_approval'`.
2. **Admin** revisa la carta en `/groups/{id}/pending` y hace clic en **"Rechazar carta"**.
3. **RPC `reject_initial_stats(player_id)`:**
   - Setea `stats_status = 'rejected'`.
   - Crea notificación tipo `'stats_rejected'` con deeplink a `/groups/{id}/pending`.
4. **Player** ve en su pantalla de carta pendiente: **"CARTA RECHAZADA"** con botón **"VOLVER A CARGAR"**.
5. **Player** corrige y re-envía.
6. **RPC `submit_onboarding_stats`** acepta inputs con `stats_status IN ('pending_approval', 'rejected')` (si está `'rejected'`, lo pasa a `'pending_approval'` y actualiza stats).
7. **Admin** vuelve a revisar. El ciclo se repite hasta que el Admin apruebe.

**Edge cases del ciclo:**

| Caso | Comportamiento |
|------|----------------|
| Admin rechaza, player nunca re-envía | La carta queda `'rejected'` permanentemente. El Admin puede aprobar manualmente desde el panel. |
| Admin rechaza y después se arrepiente | Puede aprobar directamente desde el panel de pendientes. |
| Player re-envía stats drásticamente diferentes | El Admin ve la diff y decide. No hay límite de re-intentos. |
| Admin rechaza mientras el player está en la página | No hay tiempo real. El player ve el cambio al recargar o al recibir la notificación. |

**Tipos de notificación adicionales:**

| Tipo | Push | In-app | Deeplink |
|------|------|--------|----------|
| `stats_rejected` | ❌ | ✅ | `/groups/{id}/pending` |

---

## Contratos

```ts
interface PlayerStatsAggregate {
  playerId: PlayerId;
  groupId: GroupId;
  userId: UserId | null;  // null si es phantom
  displayName: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winPercentage: number;  // calculado en cliente
  mvpCount: number;
  lastMvpAt: string | null;  // ISO datetime
  attendanceRate: number | null;  // 0-100, null si no hay partidos jugados
  lateDropouts: number;
}

async function fetchPlayerStats(
  playerId: PlayerId
): Promise<Result<PlayerStatsAggregate, AppError>>;
```

---

## Visibilidad y privacidad

**Decisión (dec-141):** transparencia total. Todos los miembros del grupo ven las stats de todos.

**Justificación:**
- Consistente con `dec-037` (overall público).
- Consistente con la cultura del fulbito amateur (chistes internos sobre el performance).
- Evita asimetría de información en decisiones del admin.
- Simplifica RLS.

**RLS policy:**

```sql
create policy "stats_visible_to_group_members"
on public.player_stats_aggregate
for select using (
  group_id in (
    select group_id from public.players
    where user_id = auth.uid() and archived_at is null
  )
);
```

Los fantasmas NO pueden consultar (no tienen user_id). Admin y players activos sí.

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Player con 0 partidos jugados | UI muestra mensaje "Todavía no jugaste". Contadores en `—` o 0. |
| Player con partidos solo como suplente | matches_played = 0 (suplente no cuenta como "jugó"). |
| Player que se fue del grupo voluntariamente y volvió | Stats preservadas, histórico continúa (dec-062). |
| Player hard-deleted y reingresa | Sin stats (sin rastro por dec-068). |
| Player expulsado con stats existentes | Stats se mantienen (flag is_expelled no borra histórico). Si intenta volver, las stats están intactas al aprobar. |
| Player fantasma con MVP | Sus stats se calculan igual. mvp_count ≥ 1. Si se convierte en real (dec-123), las stats se preservan. |
| Grupo nuevo sin partidos jugados | Todos los miembros ven "Todavía no jugaste" en sus perfiles. |
| Admin ve sus propias stats | Idéntico a cualquier otro player. Sin diferenciación. |
| Player juega en un Event cancelado | Los Events cancelados tienen status='cancelled', no 'played'. No cuentan. |
| División por cero en attendance_rate | Si el Player no jugó ningún partido del grupo desde su ingreso, attendance_rate = null. UI muestra "—". |
| Player con boost activo visible en la carta | La carta muestra overall con boost; las stats son independientes del boost. |

---

## UI/UX

### Responsive

- **Mobile:** cards en grid 2 columnas, contadores apilados verticalmente dentro de cada card.
- **Desktop:** grid 3 columnas, cards más espaciadas.

### Empty state

- Ilustración simple o ícono.
- Mensaje: *"Todavía no jugaste ningún partido en este grupo. Las estadísticas aparecen cuando juegues tu primero."*

### Loading state

- Skeleton con placeholders grises mientras carga.

### Error state

- Si falla la query: *"No pudimos cargar las estadísticas. Tocá para reintentar."*

---

## Tests

### Unit

- `fetchPlayerStats` devuelve aggregate correcto con data simulada.
- Cálculo de `winPercentage` en cliente (matches_played > 0: wins/matches * 100; si no: null).

### Integration

- VIEW `player_stats_aggregate` calcula correctamente con varios eventos y participations.
- Player con 0 partidos → contadores en 0 o null.
- Player con 5 partidos (3 wins, 1 draw, 1 loss) + 2 MVPs → aggregate correcto.
- Late dropouts: crear participations con updated_at dentro/fuera de la ventana de 6h y verificar count.
- Attendance rate con eventos previos y posteriores al joined_at del player.

### RLS

- Player del grupo A NO puede leer stats de grupos B, C.
- Player del grupo A puede leer stats de todos los players del grupo A.

---

## Copy

- Título pantalla: *"Estadísticas"* (tab)
- Sección partidos: *"Partidos"*
- Labels: *"Jugados"*, *"Ganados"*, *"Empatados"*, *"Perdidos"*, *"% Victorias"*
- Sección reconocimientos: *"Reconocimientos"*
- Labels: *"Veces MVP"*, *"Último MVP"*
- Sección participación: *"Participación"*
- Labels: *"Asistencia"*, *"Últimos 30 días"*, *"Bajas tardías"*
- Tooltip bajas tardías: *"Veces que te bajaste con menos de 6h antes del partido"*
- Empty state: *"Todavía no jugaste ningún partido en este grupo. Las estadísticas aparecen cuando juegues tu primero."*
- Error: *"No pudimos cargar las estadísticas. Tocá para reintentar."*

---

## Criterios de aceptación

- [ ] VIEW `player_stats_aggregate` creada en la migration inicial.
- [ ] Ruta `/groups/{id}/players/{player_id}/stats` funciona.
- [ ] Tab "Estadísticas" accesible desde el perfil del Player.
- [ ] Contadores visibles: matches_played, wins, draws, losses, mvp_count, attendance_rate, late_dropouts.
- [ ] Empty state para players sin partidos jugados.
- [ ] Cálculo correcto en casos edge (división por cero, participations como suplente, eventos cancelados).
- [ ] RLS permite ver stats de miembros del mismo grupo.
- [ ] Tests unit e integration pasan.

---

## Fuera de alcance

- Rankings del grupo (va a v2.1).
- Gráficos (va a v2.1).
- Achievements/logros (va a v2.1).
- Histórico de partidos detallado (link lleva a ruta que se implementa en v2.1).
- Export específico de stats (el export general ya los incluye implícitamente).
