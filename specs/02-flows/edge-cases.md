# Edge Cases V2

Casos raros con comportamiento definido. Todos los flows deben manejarlos.

---

## EC-01: 0 arqueros entre los check-ineados

**Qué pasa:** no se puede cumplir cupo `ARQ: 1` en cada equipo.

**Qué hace:** sistema alerta antes de sortear. Opciones:
- (a) Asignar automáticamente 2 MED como arqueros (el con menor `overall_actual`). Se marcan `played_primary_position=false`.
- (b) Crear 2 Players fantasma con `primary_position=ARQ`.
- (c) Cancelar y ajustar.

---

## EC-02: 1 solo arquero

**Qué pasa:** 1 equipo tiene arquero, el otro no.

**Qué hace:** alerta con opciones:
- (a) Asignar 1 MED como arquero (menor `overall_actual` disponible).
- (b) Crear 1 Player fantasma ARQ.
- (c) Cancelar.

---

## EC-03: Cantidad impar de check-ineados

**Qué pasa:** no se pueden armar 2 equipos parejos en cantidad.

**Qué hace:** alerta:
- (a) Un equipo juega con 1 más (asimétrico).
- (b) Designar 1 substitute (no entra al sorteo).
- (c) Agregar player fantasma para emparejar.
- (d) Cancelar.

No decide sola.

---

## EC-04: Más jugadores que cupo

**Qué pasa:** hay más check-ineados que `team_size × 2`.

**Qué hace:** alerta:
- (a) Sistema sugiere los N substitutes más "sobrantes" (menor antigüedad, menor overall, etc. — criterio configurable).
- (b) Admin elige manualmente.
- (c) Cambiar modalidad (ej. de F6 a F7 improvisado) — requiere feature v2.1.

---

## EC-05: Admin intenta eliminar un Player con partidos jugados

**Qué hace:** soft delete (`archived_at=now()`). Histórico se conserva, participations intactas. Después de 365 días, hard delete.

---

## EC-06: Admin intenta eliminar el Group

**Qué hace:**
- Confirmación con captcha textual (escribir el nombre del Group).
- Export automático antes de borrar (descarga ZIP).
- Hard delete en cascade: groups, memberships, players, events, participations, logs, notifications.

---

## EC-07: Group queda huérfano (Admin eliminó cuenta o se fue sin transferir)

**Qué hace:**
1. Cascade de promoción:
   - Si hay Owners: más antiguo → Admin (notificación + aceptación).
   - Si no hay Owners: `group.archived_at=now()`.
2. 30 días de ventana: soporte manual puede recuperar contactando a `ivnvldz7@gmail.com`.
3. Pasado 30 días: hard delete.

---

## EC-08: Magic link expirado

**Qué pasa:** Player fantasma → real, transferencia de admin, o reactivación de jugador que salió vuelve con link caducado (24h).

**Qué hace:** pantalla "Este link expiró. Pedí uno nuevo a tu admin." + botón para contactarlo.

---

## EC-09: Jugador recién ingresado todavía sin stats aprobadas pero quiere confirmar asistencia

**Qué pasa:** Player con `stats_status='pending_approval'` intenta marcar "voy" a un Event.

**Qué hace:** lo deja confirmar. El sorteo usa stats **aprobadas**, así que este Player:
- Si el Admin aprueba antes del partido: entra al sorteo normal.
- Si no se aprueba: no puede participar (no aparece en el listado de check-in disponibles).

Warning visible al Player: *"Tu carta está pendiente. Pedile al admin que la apruebe."*

---

## EC-10: Self-assessment con todas las stats en 8

**Qué pasa:** jugador carga todos los sliders al máximo permitido (8).

**Qué hace:** NO bloquea. El Admin ajusta en la revisión si considera que está sobrestimado. Overall máximo posible: ~80 (oro simple). 9 y 10 quedan reservados al Admin o al boost temporal (ver business-rules §3.3 y dec-043).

---

## EC-11: Jugador intenta pedir 2 revisiones seguidas

**Qué pasa:** Player ya tiene 1 request con `status='pending'` e intenta crear otra.

**Qué hace:** botón "Pedir revisión" disabled con tooltip: *"Ya tenés una solicitud pendiente."*

---

## EC-12: Admin rechaza revisión sin nota

**Qué pasa:** Admin quiere rechazar sin explicación.

**Qué hace:** sistema pide confirmación *"¿Rechazar sin mensaje al jugador? Es mejor explicarle el motivo."* pero permite continuar si insiste.

---

## EC-13: Stats durante un partido en curso

**Qué pasa:** Admin aprueba/edita stats mientras un Event está en `checked_in` esperando sorteo.

**Qué hace:** el sorteo usa **snapshot de stats** al momento de ejecutarse (no en tiempo real). Cambios posteriores no afectan el sorteo en curso. Si el Admin edita después del sorteo pero antes del `played`, se usa para `apply_match_outcome`.

---

## EC-14: Sin internet durante check-in o sorteo

**Qué pasa:** app PWA con conexión intermitente.

**Qué hace:**
- Roster cacheado en IndexedDB.
- Sorteo 100% en cliente.
- Check-in y MatchParticipations se marcan `pending_sync`.
- Al recuperar internet: sync automática.
- Conflicto last-write-wins con warning si dos devices editaron lo mismo.

---

## EC-15: 2 Owners cargan resultado en paralelo

**Qué pasa:** race condition.

**Qué hace:** optimistic locking vía `updated_at`. El segundo recibe error "Alguien ya cargó el resultado, recargá". Previene doble aplicación de boost.

---

## EC-16: Admin quiere ser Owner de su propio Group

**Qué pasa:** no tiene sentido (ya es Admin).

**Qué hace:** UI filtra al Admin de la lista de candidatos a Owner.

---

## EC-17: Jugador que salió vuelve

**Qué pasa:** Player con `archived_at IS NOT NULL` usa link de invitación para volver.

**Qué hace:**
- Si `is_expelled=false` y dentro de 365 días: reactivación automática (un-archive). Restaura stats, boost, histórico.
- Si `is_expelled=true`: solicitud al Admin. Admin aprueba o rechaza.
- Si pasó 365 días (hard delete): es como un jugador nuevo. Carga stats de cero.

---

## EC-18: Group llega al límite de 50 Players activos

**Qué hace:** al intentar aprobar el 51: error "Llegaste al límite. Archivá alguno para sumar." Archivados no cuentan.

---

## EC-19: User llega al límite de 3 Groups como Admin

**Qué hace:** al crear el 4to: error "Llegaste al máximo de 3 grupos como admin. Transferí o archivá uno."

---

## EC-20: User llega al límite de 10 Groups como Player

**Qué hace:** al aceptar invitación 11: error "Llegaste al máximo de 10 grupos. Salí de alguno para sumar."

---

## EC-21: Mismo User ya es Admin y quiere unirse como Player a otro Group

**Qué hace:** sin conflicto. Son memberships distintas en Groups distintos. Mismo User, roles separados.

---

## EC-22: Player fantasma al que el Admin no decide en 7 días

**Qué hace:** cronjob diario marca `archived_at=now()`. Sus MatchParticipations se conservan.

---

## EC-23: Todos los Owners temporales rechazan

**Qué hace:** sistema escala por antigüedad hasta agotar lista. Si nadie acepta: notification urgente al Admin, no se sortea auto.

---

## EC-24: Admin reaparece después de haber sido reemplazado por sucesión automática

**Qué pasa:** el Admin original eliminó cuenta, sistema promovió Owner a Admin. Después el original vuelve (recrea cuenta con mismo email).

**Qué hace:** al login, sistema detecta User nuevo (aunque email sea el mismo, `auth.users.id` cambió). Es un User distinto a efectos de DB. Puede unirse al Group como Player normal si tiene invite code. No recupera rol de Admin.

**Nota:** este es un caso raro que aceptamos. No hay "restauración de cuentas eliminadas" en MVP.

---

## EC-25: Evento sin confirmados suficientes al llegar la hora

**Qué pasa:** el sábado a las 20hs pero solo 8 personas confirmaron para F8 (necesita 16).

**Qué hace:**
- No se activa designación automática de Owner temporal (falta cupo, no falta admin).
- Dashboard muestra warning visible al Admin: *"Faltan 8 para el partido de hoy."*
- Admin puede: cancelar el Event, mantenerlo y jugar con menos (ajustar modalidad manualmente), o postergar.

---

## EC-26: Player con boost activo sale del Group

**Qué pasa:** `current_boost` queda guardado en su Player row pero el archivado lo oculta del Group.

**Qué hace:** si vuelve antes de 365 días, el boost original se conserva. Pero si pasaron más partidos del Group en ese tiempo, su `partidos_remaining` no se decrementa (solo decrementa al jugar).

**Caso raro resuelto:** volver con boost "congelado" es raro pero no rompe nada. El Player vuelve y en su próximo partido el boost se decrementa normalmente.

---

## EC-27: MVP elegido es Player que luego fue archivado

**Qué pasa:** Admin eligió MVP → 2 días después el MVP se va del Group.

**Qué hace:** el `mvp_player_id` persiste en el Event. Si se consulta, muestra el display_name del snapshot. La card MVP deja de aparecer al archivarse el Player. El histórico del Event se conserva intacto.

---

## EC-28: Dos Events en el mismo día para el mismo Group

**Qué pasa:** Admin crea 2 eventos el mismo sábado.

**Qué hace:** permitido. Cada Event es independiente. Un Player puede confirmar a ambos. Boosts se aplican por cada Event jugado.

---

## EC-29: Arquero cambia a delantero (o viceversa)

**Qué pasa:** Admin edita `primary_position` de ARQ a DEL.

**Qué hace:** las stats de arquero quedan **guardadas** pero no se muestran. El sistema inicializa stats de campo en el player con valores default (todas en 5). Admin debe aprobar o editar.

**Nota:** es un caso raro pero puede pasar si un Player antes era arquero y ahora es de campo. Se resuelve cambiando posición + Admin re-edita stats.

---

## EC-30: Carga de resultado sin elegir MVP

**Qué pasa:** Admin carga score pero no designa MVP.

**Qué hace:** en V2, **el MVP es obligatorio** al cargar resultado. El form no deja continuar sin seleccionarlo.

Para "ningún MVP destacado" (caso raro), el Admin puede crear una opción "sin MVP" que aplica boost solo por victoria/derrota sin bonus de MVP. Revisar si va a MVP V2 o v2.1.

**Decisión para V2:** MVP obligatorio. Si nadie destacó, el Admin elige al mejor de su criterio o al que más partidos hizo. No hay "sin MVP" en MVP V2.

---

## EC-31: Notificación push rechazada / no disponible

**Qué pasa:** User no dio permiso de push, o iOS < 16.4, o PWA no instalada.

**Qué hace:** el canal push falla silenciosamente. Fallback:
- Email para eventos críticos (según tabla en business-rules §14.2).
- Badge in-app visible al abrir la app.
- No se bloquea funcionalidad.

---

## EC-32: Link de Google Maps inválido

**Qué pasa:** Admin pega un link que no es válido.

**Qué hace:** validación client-side: debe empezar con `https://` y contener `maps.google.` o `goo.gl/maps`. Si no cumple, warning pero se guarda tal cual. Botón "Abrir en Maps" lo intenta abrir; si falla, es responsabilidad del admin corregir.

---

## EC-33: Donation link inválido

**Qué pasa:** Admin pega cualquier URL en el campo de donación.

**Qué hace:** validación básica de URL. Si es válida, se muestra en el dashboard como botón "Invitale un café a {admin_name}". No se valida el destino.

---

## EC-34: Push notifications activas pero endpoint muerto

**Qué pasa:** el usuario desinstaló la PWA o el endpoint de push expiró.

**Qué hace:** cuando falla el push, sistema marca la `push_subscription` como `archived`. Próximas notifications caen solo por email + in-app.
