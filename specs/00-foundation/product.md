# Product — El Fulbo V2

## Problema

La gente que organiza fulbito amateur tiene su flujo disperso en 4-5 herramientas distintas: WhatsApp para hablar, encuestas de WhatsApp para convocar, Google Maps para compartir la cancha, Excel o papel para recordar resultados, y la memoria colectiva para armar equipos parejos. **El dolor real es la fragmentación.**

**Cita textual de usuario entrevistado:** *"Me molesta la falta de customización, tener que tener más de una app para organizar una sola tarea."*

## Objetivo

Una PWA instalable que unifica todo el ciclo del fulbito amateur en una sola experiencia: el organizador crea el evento, los jugadores confirman asistencia desde la app, el sorteo se hace en la cancha respetando posiciones y cupos, se carga el resultado y se elige el MVP, y el sistema actualiza las cards FIFA de cada jugador con boosts temporales visibles.

**Competidor real:** WhatsApp. La barra es ser tan fluido como usar una encuesta de WhatsApp.

## Usuarios

- **Jugador (User):** cuenta propia con login Google OAuth. Cada jugador tiene su carta FIFA con stats. Confirma asistencia a partidos, ve su overall, comparte su carta.
- **Admin:** rol que tiene 1 User por grupo (el creador). Crea eventos, edita stats base, aprueba cartas iniciales y solicitudes de revisión, designa owners.
- **Owner:** hasta 2 por grupo, designados por el Admin. Pueden sortear, hacer check-in, cargar resultado y elegir MVP. **No editan stats.**
- **Owner temporal:** si el Admin no confirma asistencia y no hay owners fijos, el sistema designa 2 automáticamente según antigüedad + confirmación. Poderes duran 24h post-partido.

## Alcance inicial (MVP)

**Features validadas por 4 entrevistas:**

- Cada jugador con cuenta propia (Google OAuth).
- Self-assessment inicial de stats + aprobación del Admin.
- Cards tipo FIFA con tiers bronce/plata/oro simple/oro + card especial MVP.
- Stats con boost temporal visible (3 partidos) por rendimiento individual.
- Solicitud de revisión de stats (jugador pide, Admin aprueba/rechaza).
- Evento con fecha, hora, cancha + link a Google Maps.
- Confirmación individual de asistencia (voy / no voy / tal vez).
- Notificación al Admin cuando alguien se baja.
- Check-in en la cancha antes de sortear.
- Sorteo respetando posiciones, cupos y modalidad (F5/F6/F8/F11).
- Player fantasma para completar equipos de último momento.
- Carga de resultado + elección de MVP.
- Aplicación automática de boosts post-partido.
- Card compartible vía Web Share API.
- Multi-grupo (jugador puede estar en hasta 10, Admin en hasta 3).
- Owners fijos (hasta 2) + Owners temporales automáticos.
- Export de datos JSON/CSV.
- Sección "Creado por" + link de donación externa (Cafecito/MercadoPago).

## Soporte

Email de contacto único: **ivnvldz7@gmail.com**.

## Fuera de alcance (MVP)

- App nativa iOS/Android.
- Chat interno (ver backlog).
- Votación comunitaria del MVP (ahora lo elige el Admin).
- Integración directa con WhatsApp API.
- Integración de pagos real (donaciones son link externo).
- Stats extendidas por partido (goles, asistencias individuales).
- Ranking comparativo entre grupos.
- Notificaciones SMS.
- Edición de formaciones default por modalidad.

## No-goals (decisiones deliberadas)

- La app **no reemplaza el juicio del Admin:** las stats las edita él, siempre.
- **Nunca se penalizan derrotas** en el sistema de boosts. Filosofía de producto.
- **Cero anuncios**. El modelo de monetización (si existe) es donación voluntaria.
- **No buscamos 100% de paridad** en el sorteo: "suficientemente parejo" en segundos es la meta.
- **No competimos contra apps de fútbol existentes.** Competimos contra WhatsApp.
