# feat-010 — Compartir card

## Objetivo

Permitir al jugador compartir su card FIFA como imagen (PNG) vía Web Share API o descarga directa. Este es el principal vector de viralidad del producto: cada card compartida en WhatsApp es publicidad orgánica.

---

## Referencias

- **Flows:** implícito en el flujo del Event post-resultado + acceso directo desde la carta del Player.
- **Entidades:** `Player`, `CurrentBoost`.
- **Decisiones del engram:** `dec-118` a `dec-121`.

---

## Alcance

### Incluye

- Botón "Compartir" en la pantalla canónica donde hoy se renderiza la card propia del Player.
- Botón "Compartir resumen" en la pantalla post-resultado.
- Generación de imagen PNG con `html-to-image`.
- Uso de Web Share API si disponible, fallback a descarga.
- Diseño estético FIFA en la imagen.
- Watermark chico "El Fulbo" en la imagen.
- Compartir card MVP con efecto especial si el player fue MVP reciente.

### No incluye

- Compartir a redes sociales específicas (Instagram stories, etc.) — se delega al share sheet del OS.
- Compartir perfiles de otros jugadores (solo compartir la propia).
- Generación de videos o animaciones — solo imagen estática.

---

## Flujo

### Etapa 1 — Acceso al botón compartir

**Desde la carta del Player:**

- En la superficie canónica donde hoy se muestra la propia card (dashboard del grupo o equivalente), botón **"Compartir mi card"**.
- Si es card de otro player, **no hay botón de compartir** (respeta privacidad; no podés compartir la card ajena).

**Desde el post-resultado del partido:**

- Botón **"Compartir resumen"** en `/groups/{id}/events/{event_id}` cuando `status=='played'`.
- Este comparte una imagen con el scoreboard + MVP + tabla de boosts aplicados.

### Etapa 2 — Generación de la imagen

Al tocar "Compartir", el cliente:

1. Renderiza en memoria un componente React específico `<ShareableCard />` que combina:
   - Background con gradiente FIFA según tier (bronce/plata/oro simple/oro).
   - Foto del player grande al centro.
   - Overall grande arriba izquierda.
   - Posición grande arriba derecha.
   - Nombre del player en el centro abajo.
   - Grid 2x3 con las 6 stats + badges de boost si hay.
   - Chip chico con nombre del grupo.
   - Watermark: *"El Fulbo"* arriba a la derecha chico.
2. Usa `html-to-image` para convertirlo a PNG (resolución 1200x1800 para buena calidad).
3. Guarda el blob en memoria.

### Etapa 3 — Share

**Si `navigator.share` y `navigator.canShare({ files: [...] })`:**

```ts
await navigator.share({
  title: `Mi card en ${groupName}`,
  text: `Acá está mi card FIFA en ${groupName}. Overall: ${overall}.`,
  files: [new File([blob], 'mi-card.png', { type: 'image/png' })],
});
```

**Fallback (desktop o navegador sin Web Share con files):**
- Descarga automática del PNG al sistema.
- Toast: *"Card descargada. Podés subirla donde quieras."*.

### Etapa 4 — Imagen del resumen del partido

**Componente `<ShareableMatchSummary />`:**

- Título: *"Partido del {fecha corta}"*.
- Nombre del grupo + logo.
- Scoreboard grande: `Equipo A 3 — 1 Equipo B`.
- Card chica del MVP con halo dorado.
- Lista de boosts aplicados (top 5).
- Watermark *"El Fulbo"*.

**Flow de compartir:** idéntico a card individual.

---

## Copy

- Botón card individual: *"Compartir mi card"*
- Botón resumen partido: *"Compartir resumen"*
- Share text card: *"Acá está mi card FIFA en {grupo}. Overall: {N}."*
- Share text resumen: *"Resumen del partido del {fecha} en {grupo}."*
- Toast descarga: *"Card descargada. Podés subirla donde quieras."*
- Toast error: *"No pudimos generar la imagen. Reintentá."*

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Player intenta compartir card de otro | El botón no existe en la card ajena (UI). Si alguien llama la API directa, se bloquea. |
| Generación falla por memoria o timeout | Toast de error, sin crash. |
| Web Share disponible pero usuario cancela en share sheet | Catch el error silenciosamente (sin toast). |
| Player sin foto de perfil | Se usa un placeholder neutral (iniciales o ícono). |
| Player con boost activo | La imagen incluye badges "+N" en las stats correspondientes. |
| Player es MVP actual | Se genera la card MVP con halo dorado. |

---

## Validaciones

- Generación solo para el propio Player (verificación en frontend al mostrar el botón).
- Tamaño máximo de imagen: 2MB (resolución 1200x1800 con compresión PNG suele dar <500kb).

---

## Tests

### Unit
- `<ShareableCard />` renderiza con datos de un Player.
- Incluye badges si hay boost activo.
- `shareImageBlob` usa Web Share API con files cuando está disponible.
- `shareImageBlob` hace fallback a descarga cuando no hay file share.

### Integration
- Click en "Compartir" genera PNG válido.
- Web Share API se invoca correctamente con file.
- Fallback a descarga funciona en desktop.

### E2E
- Player comparte su card y el flujo termina exitosamente.

---

## Estado de implementación real

- `src/components/share/shareable-card.tsx` genera la card exportable con watermark, boost badges y chip de duración.
- `src/components/share/player-card-share-panel.tsx` muestra la propia card y el botón **"Compartir mi card"** en el dashboard del grupo, usando `html-to-image`.
- `src/components/share/shareable-match-summary.tsx` y `src/components/share/share-match-summary-button.tsx` generan la imagen del resumen post-partido con scoreboard, MVP y boosts aplicados.
- `src/lib/share.ts` centraliza el uso de Web Share API con files y el fallback a descarga.
- `/groups/[id]/events/[event_id]` dejó de compartir texto plano y ahora comparte imagen del resumen.

## Criterios de aceptación

- [x] Botón compartir visible en la propia card, no en ajenas.
- [x] Imagen generada tiene la estética FIFA correcta según tier.
- [x] Boost badges visibles en la imagen.
- [x] Web Share API usada si disponible, con file.
- [x] Fallback a descarga en desktop.
- [x] Watermark "El Fulbo" visible pero discreto.
- [x] Resumen de partido también compartible.
- [x] Tests pasan.
