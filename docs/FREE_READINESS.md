# Free Readiness

La versión Free debe permitir organizar un partido real sin caer en callejones sin salida. No incluye billing, paywall ni límites de plan.

## Contrato Free

| Área | Debe estar disponible en Free |
| --- | --- |
| Grupo | Crear grupo, entrar al dashboard e invitar jugadores |
| Jugadores | Ver lista, ver carta propia y ver cartas permitidas |
| Card | Ver carta propia, compartirla y subir foto cuando el estado/permisos lo permitan |
| Partido | Crear evento, confirmar asistencia, check-in, sorteo, resultado |
| MVP | Entrar a votar/ver votos desde una ruta accesible después del partido |
| Notificaciones | Esenciales/best-effort, sin promesa de push rápida |

## Rutas fuente de verdad

Las rutas de producto deben construirse desde `src/lib/routes.ts`. Evitar hardcodear URLs en componentes cuando exista helper.

Rutas principales:

- `routes.groupDashboard(groupId)`
- `routes.groupEvent(groupId, eventId)`
- `routes.groupEventMvpVote(groupId, eventId)`
- `routes.groupPlayers(groupId)`
- `routes.groupPlayer(groupId, playerId)`
- `routes.groupPlayerEditCard(groupId, playerId)`
- `routes.profile`

## Criterio de aceptación

- El dashboard funciona como hub principal del grupo.
- Toda acción core tiene un camino visible desde el producto, no solo por URL manual.
- Los deeplinks de notificaciones llevan a pantallas útiles.
- La card propia se puede ver y compartir desde Free.
- La UI no promete acciones que los permisos reales no permiten.
- Pro queda como automatización futura, no como bloqueo del producto base.

## Próximo hardening recomendado

Auditar con navegador real el flujo completo:

1. Crear grupo.
2. Completar card.
3. Crear partido.
4. Confirmar asistencia.
5. Cargar resultado.
6. Entrar a MVP desde dashboard.
7. Ver/compartir card propia.
