# El Fulbo — Visión V2

> **Documento central del producto después del pivote del 2026-04-20.**
> Foundation, Domain, Flows y Features V2 se referencian contra este documento.
> Si algo contradice esta visión, se revisa acá primero.

---

## 1. La visión en una frase

**El Fulbo es la app que reemplaza todo el quilombo de organizar fulbito en WhatsApp.**

No es una app de sorteo. No es una app de stats. Es la herramienta única que reemplaza encuestas, listas, eventos y mensajes sueltos de WhatsApp con una sola experiencia: **evento → confirmación → sorteo → resultado → memoria**.

---

## 2. El problema real (validado por 4 entrevistas)

La gente que organiza fulbito ya tiene un flujo que funciona, solo que está disperso en features nativas de WhatsApp:

- Encuestas para saber quién va.
- Listas manuales que alguien mantiene.
- Eventos de WhatsApp para la fecha.
- Mensajes sueltos para coordinar lugar, hora, cambios.
- Discusiones previas sobre equipos.
- Ningún registro de lo que pasó después.

El dolor no es la calidad de las apps existentes, es la **fragmentación**.

**Cita textual de entrevista:** *"Me molesta la falta de customización, tener que tener más de una app para organizar una sola tarea."*

---

## 3. El competidor real

**No es TeamStuff, SquadUp ni Spond. Es WhatsApp.**

La barra: ser **tan fluidos como usar una encuesta de WhatsApp**. Cero fricción, cero curva de aprendizaje, cero formularios largos.

---

## 4. Perfil de usuario validado

**Rango etario:** 16 a 50+ años. Amplio.

- **Tono:** argentino coloquial sin slang juvenil ni formalismo.
- **UX:** muy visual, muy directa, mínimo texto, poco scroll.
- **Onboarding:** 3 clicks máximo para ver valor.
- **Estética FIFA:** escala entre generaciones.

---

## 5. Features del MVP V2

### Validadas por usuarios (U)

1. Cada jugador con su cuenta.
2. Cards tipo FIFA con tiers bronce/plata/oro.
3. Stats con boost temporal que sube y baja.
4. Confirmación de asistencia dentro de la app.
5. Evento con fecha/hora/cancha + link a Maps.
6. Sorteo en la cancha (no antes).
7. Notificación al admin cuando alguien se baja.
8. Chat interno (**futuro, NO MVP**).

### Decisión del fundador (V)

9. Login con Google (OAuth, sin password).
10. Voto MVP del partido (MVP: admin elige; V2.1: votación comunitaria).
11. Sección "creado por" + donación externa (link tipo Cafecito).

---

## 6. Decisiones estructurales cerradas

Todas registradas en `engram/decisions.json`.

### 6.1 Usuarios y roles

- **Cada jugador es un User con cuenta propia** (login Google OAuth).
- **Admin:** organizador, 1 por grupo. Único que edita stats base.
- **Owners (hasta 2):** elegidos por el Admin. Pueden sortear, cargar resultado, elegir MVP. **No editan stats ni aprueban revisiones.**
- **Owners temporales automáticos:** si el Admin no confirma asistencia y no hay owners fijos, el sistema promueve a 2 jugadores (criterio: antigüedad + confirmación). Sus poderes duran hasta 24h después del partido.
- **Un User puede ser Admin de máximo 3 grupos**. Como jugador, máximo 10 grupos en total.

### 6.2 Stats y cards

- **Stats de jugador de campo:** PAC (velocidad), SHO (tiro), PAS (pase), DRI (regate), DEF (defensa), PHY (fuerza). Escala 1-10 cargada, 1-99 visualizada.
- **Stats de arquero (distintas):** DIV (estirada), HAN (manos), KIC (saque con pie), REF (reflejos), SPD (velocidad de salida), POS (colocación).
- **Overall:** promedio ponderado por posición, escalado a 1-99.
- **Tiers FIFA:**
  - Bronce: ≤65
  - Plata: 66-75
  - Oro simple: 76-83
  - Oro: ≥84

### 6.3 Flujo de stats iniciales

- Jugador nuevo se registra → arma su propia carta con stats iniciales.
- La carta queda en **"pendiente de aprobación"**, visible solo para el jugador.
- Admin recibe notificación → ajusta valores → aprueba → la carta pasa a pública.
- Después, el jugador puede **solicitar revisión** de sus stats; el admin aprueba o rechaza.
- **El jugador nunca edita stats directamente.** Solo el admin.
- Cuando el admin aprueba un cambio, el grupo entero ve un log público: *"El admin actualizó las stats de Juan: PAC 7→8"*.

### 6.4 Player fantasma

- Admin puede crear un "player fantasma" para completar un equipo si falta un jugador al momento del partido.
- Stats default: 6/6/6/6/6/6, posición MED, sin cuenta.
- Post-partido, el admin decide: convertirlo en player real (magic link para crear cuenta), archivarlo o eliminarlo.
- Si el admin no decide en 7 días, se archiva automáticamente.
- Sus participaciones en partidos se conservan.

### 6.5 Algoritmo de stats (boost temporal, reemplaza ELO)

- **Stats base no cambian por partidos.** Solo el boost se mueve.
- **Boost temporal dura 3 partidos consecutivos del jugador.**
- **Detonantes:**
  - **Victoria + MVP:** boost grande → +3 a +5 en stats principales de la posición, +1 en las demás.
  - **Victoria sin MVP:** boost chico → +1 a +2 en stats principales, nada en las demás.
  - **Empate o derrota + MVP:** boost chico → +1 a +2 en stats principales.
  - **Derrota sin MVP:** sin cambios.
- **Nunca hay penalizaciones por derrota.** Filosofía del producto.

### 6.6 El ciclo del partido (corazón del producto)

1. **Evento:** admin crea partido con fecha, hora, cancha + link a Maps, modalidad.
2. **Confirmación:** cada jugador marca *"voy / no voy / tal vez"*.
3. **Monitoreo:** si alguien se baja, el admin recibe notificación.
4. **Check-in:** en la cancha, admin pasa lista de quién está físicamente.
5. **Sorteo:** se hace con los confirmados presentes.
6. **Partido:** se juega.
7. **Resultado:** admin (u owner) carga score.
8. **MVP:** admin (u owner) elige MVP.
9. **Boost:** sistema aplica boosts según reglas.
10. **Cards actualizadas:** todos ven su card. Compartible en WhatsApp.

### 6.7 Jugador que se va del grupo

- **Voluntariamente:** soft delete, histórico conservado 1 año. Si vuelve antes, se restaura todo. Si no vuelve, hard delete a los 365 días.
- **Expulsado por admin:** soft delete con flag `expelled`. Si intenta volver, requiere aprobación del admin.

### 6.8 Notificaciones

- **Web Push API:** canal principal (Android/Chrome/Firefox siempre, iOS 16.4+ si PWA instalada).
- **Badge in-app:** fallback visual cuando el usuario abre la app.
- **Email:** resumen semanal del grupo + eventos críticos (owner temporal designado, solicitud de revisión aprobada, etc.).
- **Sin SMS** (fuera de MVP).

---

## 7. Qué se conserva del V1

- Stack técnico: Next.js 14 + Supabase + Vercel + Tailwind.
- Metodología SDD y estructura de carpetas `specs/NN-area/`.
- Orquestación multi-agente (Designer/Implementer/Auditor).
- Formaciones por modalidad (F5/F6/F8/F11).
- MED como posición comodín.
- Algoritmo de balanceo conceptual (satisfacción de cupos + greedy).
- Multi-grupo.
- PWA instalable, offline-first para sorteo.
- Export de datos como protección contra admin tóxico.
- Email de soporte: `ivnvldz7@gmail.com`.

---

## 8. Qué se descarta del V1

| Descartado | Razón |
|------------|-------|
| Parseo de lista de WhatsApp | Reemplazado por confirmación individual en app. |
| Rating Interno oculto tipo ELO | Reemplazado por boost temporal visible. |
| Modelo User/Player separado | Ahora cada jugador tiene User. |
| Invitados +1 sin cuenta | Reemplazado por player fantasma (admin lo crea). |
| Sucesión compleja con magic link | Owners temporales automáticos cubren el caso. |
| Magic link como único auth | Reemplazado por Google OAuth. |

---

## 9. Riesgos y mitigaciones

### R1: "Chat futuro"
- **Mitigación:** regla escrita. No se diseña arquitectura pensando en chat.

### R2: Rango etario amplio
- **Mitigación:** testing con los 4 usuarios entrevistados antes de cada feature grande.

### R3: Competir contra WhatsApp
- **Mitigación:** obsesión con "3 clicks al valor". Cada flujo se benchmarkea contra la feature equivalente de WhatsApp.

### R4: Expansión de scope
- **Mitigación:** las 8 features validadas + las 3 del fundador son el techo del MVP.

### R5: Muestra chica (4 entrevistas)
- **Mitigación:** al lanzar MVP, mostrar a 8-10 usuarios más antes de marketing.

---

## 10. Indicadores de éxito del MVP V2

Al mes de lanzar con 3 grupos de prueba:

- ✅ Al menos 2 de los 3 grupos dejaron de usar encuestas de WhatsApp para organizar.
- ✅ El organizador dice que le toma menos tiempo que antes.
- ✅ Los jugadores abren la app al menos 1 vez por semana.
- ✅ Se comparte al menos 1 card por partido en WhatsApp.

Si **no se cumplen 3 de 4**, pivotear.

---

## 11. Próximos pasos

1. ✅ Foundation V2 (product, glossary, architecture-decisions).
2. ✅ Domain V2 (entities, business-rules, balancing-algorithm).
3. ✅ Flows V2 iniciales (core-flows, edge-cases).
4. ✅ Contracts V2 completos (db-schema, types.ts, error-model).
5. ✅ Quality V2 actualizado.
6. ✅ Features V2 en orden priorizado:
   1. `feat-001 onboarding-user` (signup Google OAuth + self-assessment de stats).
   2. `feat-002 create-group` (admin crea grupo).
   3. `feat-003 join-group` (jugador entra a grupo por invitación).
   4. `feat-004 admin-dashboard` (admin resuelve pendientes).
   5. `feat-005 create-event` (admin crea partido con fecha/hora/Maps).
   6. `feat-006 confirm-attendance` (jugadores confirman).
   7. `feat-007 check-in-and-draw` (check-in en cancha + sorteo).
   8. `feat-008 load-result-and-mvp` (cargar resultado + elegir MVP).
   9. `feat-009 boost-system` (aplicar boosts post-partido).
   10. `feat-010 share-card` (card FIFA compartible).
   11. `feat-011 manage-owners` (admin designa owners, temporales auto).
   12. `feat-012 notifications` (Web Push + email semanal).
   13. `feat-013 phantom-player` (admin crea fantasma para completar).
   14. `feat-014 export-data` (backup JSON/CSV).
   15. `feat-015 player-stats` (stats individuales agregadas).
7. ⬜ Bootstrap del proyecto Next.js con Codex.
8. ⬜ Implementación feature por feature siguiendo ciclo Designer → Implementer → Auditor.
