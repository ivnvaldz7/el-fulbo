# Glossary V2

Términos que usa todo el sistema con una **única definición** para evitar ambigüedad.

---

## Entidades principales

- **User:** entidad de autenticación. Todo jugador es un User (login Google OAuth). El rol de Admin u Owner se aplica sobre el User dentro de un Group específico.
- **Group:** unidad lógica que contiene un roster, eventos y configuración. Tiene 1 Admin, 0-2 Owners, y hasta 50 jugadores activos.
- **Player:** vinculación User ↔ Group. Un User puede ser Player en múltiples Groups (hasta 10). Contiene las stats, posición, tier y estado (active/archived/expelled).
- **Admin:** rol del User que creó el Group. 1 solo por Group. Único que edita stats base, aprueba cartas iniciales y solicitudes de revisión, designa Owners.
- **Owner:** hasta 2 por Group, designados por el Admin. Puede sortear, hacer check-in, cargar resultado, elegir MVP. No edita stats.
- **Owner temporal:** Owner designado automáticamente por el sistema cuando el Admin no confirma asistencia al evento y no hay Owners fijos. Se eligen 2 según antigüedad + confirmación. Poderes duran 24h después del partido.

---

## Stats y cards

- **Stats base:** los 6 valores 1-10 de un jugador. Los carga inicialmente el propio jugador (self-assessment), el Admin aprueba y ajusta. Después, solo el Admin edita.
- **Stats de jugador de campo:** PAC (velocidad), SHO (tiro), PAS (pase), DRI (regate), DEF (defensa), PHY (fuerza).
- **Stats de arquero:** DIV (estirada), HAN (manos), KIC (saque), REF (reflejos), SPD (velocidad de salida), POS (colocación). Distintas a las de campo.
- **Stats principales por posición:** las 2 stats más pesadas según posición (ej. delantero: PAC+SHO). Reciben más boost.
- **Boost temporal:** modificador visible sobre stats durante 3 partidos consecutivos del jugador. Se genera por rendimiento individual (victoria, MVP). Nunca negativo.
- **Overall:** número 1-99 calculado como promedio ponderado de stats según posición. Visible en la card.
- **Tier:** banda de la card según overall:
  - Bronce: ≤65
  - Plata: 66-75
  - Oro simple: 76-83
  - Oro: ≥84
- **Card:** representación visual tipo FIFA del jugador. Muestra foto, overall, tier, stats, posición, boost actual.
- **Card MVP:** diseño especial (dorada con efectos) que se activa cuando el jugador fue MVP del último partido.
- **Solicitud de revisión:** pedido del jugador al Admin para cambiar sus stats. Admin aprueba o rechaza. Al aprobar, se registra log público del cambio.

---

## Ciclo del partido

- **Modalidad:** formato del partido. Valores: F5, F6, F8, F11.
- **Formación:** distribución por posición según modalidad. F5 (1-1-2-1), F6 (1-2-2-1), F8 (1-3-3-1), F11 (1-4-3-3).
- **Evento (Match):** instancia de un partido con fecha, hora, cancha + link a Maps, modalidad, lista de confirmados.
- **Confirmación:** respuesta del jugador al evento: `going` (voy), `not_going` (no voy), `maybe` (tal vez). Puede cambiarse hasta el check-in.
- **Check-in:** proceso del Admin (u Owner) en la cancha: pasa lista de quién está físicamente presente. Solo los marcados entran al sorteo.
- **Sorteo:** algoritmo de balanceo que divide a los check-ineados en dos equipos, respetando cupos por posición y minimizando diferencia de overall.
- **Player fantasma:** jugador creado por el Admin en el momento para completar un equipo si falta alguien. Stats default 6/6/6/6/6/6, posición MED, sin cuenta. Post-partido: Admin decide convertirlo, archivar o eliminar.
- **Resultado:** score del partido, cargado por Admin u Owner después del juego.
- **MVP del partido:** jugador destacado, elegido por Admin u Owner. Activa boost grande + card especial.
- **Boost aplicado:** modificador que el sistema agrega a las stats del jugador post-partido según reglas. Dura 3 partidos del jugador.

---

## Posiciones

- **ARQ:** Arquero. Usa stats de arquero.
- **DEF:** Defensor. Principales: DEF + PHY.
- **MED:** Mediocampista. Principales: PAS + DRI. Posición **comodín** (puede cubrir DEF o DEL sin penalización).
- **DEL:** Delantero. Principales: PAC + SHO.
- **Posición primaria:** la posición principal del jugador.
- **Posición secundaria:** opcional, segunda posición que juega bien. Se usa para cubrir huecos.

---

## Infraestructura

- **Cupo de posición:** número mínimo de jugadores por posición requerido en una formación.
- **Jugador comodín:** MED que puede empujarse a DEF o DEL sin impacto en stats. ARQ y DEL puros no son comodines.
- **PWA:** Progressive Web App. El Fulbo es instalable como PWA en iOS/Android/desktop.
- **Web Push:** mecanismo de notificaciones push compatible con PWA. Requiere permiso del usuario. En iOS solo funciona si la PWA está instalada en home screen.
- **Magic Link:** se usa **solo** para: invitación a player fantasma, export de datos, recuperación de cuenta en casos especiales. El login regular es Google OAuth.
- **Export de datos:** función disponible para Admin y Owners. Genera ZIP con roster, partidos, stats, historial. Formatos JSON + CSV.

---

## Gobernanza

- **Grupo huérfano:** Group que quedó sin Admin ni Owners. Se archiva automáticamente y se conserva 30 días antes de hard delete.
- **Jugador expulsado:** Player con flag `expelled=true`. Soft-deleted. Si intenta volver, requiere aprobación del Admin.
- **Jugador que salió voluntariamente:** soft-delete, histórico 1 año, puede volver sin aprobación.
- **Log público de cambios de stats:** cuando el Admin aprueba un cambio, todo el grupo ve un evento: *"El admin ajustó stats de Juan: PAC 7→8"*. Transparencia total.

---

## Técnico (referencias rápidas)

- **Stack:** Next.js 14 + TypeScript + Tailwind + Supabase + Vercel.
- **Auth:** Google OAuth (Supabase Auth).
- **DB:** PostgreSQL con Row Level Security.
- **Storage:** Supabase Storage para fotos de perfil y logos.
- **Estado cliente:** Zustand + TanStack Query.
- **PWA:** next-pwa con Workbox.
- **Notificaciones:** Web Push API + email (Supabase) + in-app badge.

---

## Límites hard

- **50 players activos por Group.**
- **3 Groups como Admin por User.**
- **10 Groups como Player (incluye Admin) por User.**
- **2 Owners fijos por Group** (además del Admin).
- **Hasta 2 Owners temporales** automáticos por evento.
- **Histórico de jugador:** 365 días después del soft-delete, hard delete.
- **Boost temporal:** dura 3 partidos del jugador (no días, no semanas).
- **Player fantasma:** decisión del Admin en 7 días o se archiva solo.
