# Backlog V2

Ideas y features que **no están en el MVP V2**. Si el MVP valida, se evalúan en v2.1+.

Ordenadas por impacto esperado.

---

## Post-MVP (v2.1)

### Chat interno del grupo
- Mensajería por Group.
- Menciones a jugadores.
- Foto/stickers básicos.
- **Riesgo:** reabre el problema de fragmentación (compite con WhatsApp mismo).
- **Mitigación:** solo para coordinación de partidos, no chat general.
- **Decisión firme de V2:** NO se diseña arquitectura pensando en chat. Si entra, es módulo nuevo.

### Votación comunitaria del MVP
- En vez de que el Admin elija el MVP, los jugadores votan post-partido.
- Ventana de votación: 24h después del partido.
- Cada jugador 1 voto.
- Empate → Admin desempata.

### Integración de pagos
- MercadoPago SDK para recibir donaciones dentro de la app.
- División automática del costo de la cancha entre los que jugaron.
- **Riesgo:** complejidad legal y fricción de onboarding.

---

## v2.2

### Stats extendidas por partido
- Por Event: goles individuales, asistencias, tarjetas.
- Boost diferencial según performance específica.
- **Pregunta abierta:** ¿quién carga? Admin es mucha fricción.

### Ranking entre grupos (opt-in)
- Grupos pueden hacer "partido amistoso" entre ellos.
- Registro compartido.

### Edición de formaciones default por modalidad
- Group puede definir su propia formación preferida (ej. 1-2-3-2 para F8).

### Historial de partidos exportable como imagen
- "Álbum de figuritas" visual del Group con todos los MVPs del año.

---

## v3.x (largo plazo)

### App nativa
- iOS/Android con React Native o Flutter.
- Requisito: base de usuarios grande.

### Features de entrenamiento
- Plan de partidos sugeridos por IA.
- Sugerencias de mejora de stats basadas en patrones.

### Integración real con WhatsApp
- Bot de WhatsApp que crea el evento + dispara confirmación.
- Requiere WhatsApp Business API.

---

## Deuda técnica

- Tests E2E para flujos secundarios (transferencia de admin, grupo huérfano).
- Coverage de unit ≥ 80% (actualmente objetivo 70%).
- Rate limiting server-side real en Supabase Edge Functions.
- CDN para imágenes de cards compartidas.
- Optimización del bundle inicial (target < 200kb gzipped).
- Dark mode.

---

## Mejoras de UX

- Onboarding guiado con progreso (3 pasos visibles).
- Tutorial interactivo al crear primer grupo.
- Animación de boost aplicado (la card sube con efecto).
- Comparador de cards lado a lado.
- Widget iOS/Android con próximo partido.

---

## Observaciones para evaluar

### Sorteador rápido sin login (el V1)
**Del V1**: "sorteador instantáneo" sin registrarse, pensado como gancho para traer usuarios. **No validado** por las 4 entrevistas; la gente no lo pidió.

Si el V2 no convierte lo suficiente, **volver a considerar** un `/sorteo-rapido` público sin login, como CTA de la landing.

### Comentarios del partido
Como Steam reviews: post-partido podés comentar. "Estuvo lindo el partido." Feedback emocional. **Riesgo:** puede convertirse en chat por la ventana trasera. Evaluar después de tener chat decidido.

### Formaciones custom
Groups raros pueden querer F7 o F9 custom. Dejar para v2.2.

### Mapa de canchas frecuentes
Group recuerda canchas usadas antes. Al crear evento, autocompleta. Mejora UX con cero tradeoff. **Candidato fuerte para v2.1.**

---

## Criterios para pasar del backlog al MVP+1

Una feature del backlog pasa a "próxima release" si cumple **al menos 2 de 3**:

1. Al menos 5 usuarios distintos la pidieron.
2. Resuelve fricción reportada en entrevistas post-MVP.
3. Ayuda a cumplir alguno de los 4 KPIs (ver _v2-vision.md §10).
