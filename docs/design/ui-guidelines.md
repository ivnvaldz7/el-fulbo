# UI Guidelines — El Fulbo V2

## Principio visual base

El Fulbo usa una UI emocional, simple y directa:

**imagen de fondo + overlay oscuro + card funcional por encima + una acción principal.**

La app compite contra WhatsApp, por eso cada pantalla debe sentirse rápida, obvia y sin fricción.

---

## Patrón principal

### Background

- Usar imagen full screen relacionada con fulbito:
  - cancha
  - pelota
  - grupo de amigos
  - botines
  - vestuario
  - luces de cancha nocturna
- La imagen no debe competir con el contenido.
- Siempre aplicar overlay oscuro.

### Overlay

- Oscuro, semitransparente.
- Debe asegurar contraste AA.
- El contenido debe leerse aunque la imagen sea fuerte.

### Card funcional

- Card o bloque por encima del fondo.
- Preferencia:
  - mobile: card inferior
  - desktop: card centrada o lateral
- Bordes redondeados.
- Fondo sólido oscuro o glass suave.
- Padding generoso.
- No saturar de elementos.

---

## Regla de una acción

Cada pantalla debe tener **una acción principal dominante**.

Permitido:

- 1 CTA principal
- 1 acción secundaria discreta

Evitar:

- 3 o más botones compitiendo
- múltiples mensajes principales
- formularios largos

---

## Tono visual

- Deportivo
- Urbano
- No corporativo
- No infantil
- No “casino”
- No exceso de efectos FIFA

La app puede inspirarse en cards FIFA, pero no debe parecer un juego pesado.

---

## Copy

Usar español argentino simple.

Ejemplos:

- “Nuevo grupo”
- “Crear grupo”
- “Sumá a tus jugadores”
- “Compartí el link”
- “Retomamos donde te quedaste”

Evitar:

- lenguaje demasiado formal
- jerga técnica
- textos largos

---

## Forms

Los formularios deben ser mínimos.

Reglas:

- validar al submit, no bloquear antes de tiempo salvo casos obvios
- errores inline
- botón principal siempre visible
- en mobile, CTA sticky abajo si el form ocupa toda la pantalla

---

## Loading states

Evitar spinner solo.

Preferir micro-feedback:

- “Creando tu grupo”
- “Preparando tu cancha”
- “Un toque más y está listo”

---

## Empty states

Los empty states deben empujar a una acción clara.

Ejemplo:

Título:
“Todavía no tenés ningún grupo”

Texto:
“Creá tu primer grupo y empezá a jugar con tus amigos.”

CTA:
“Crear tu primer grupo”

---

## Share / invitación

La invitación es una acción crítica del producto.

Reglas:

- CTA visible y dominante
- usar Web Share API si está disponible
- fallback a clipboard
- mostrar feedback claro al copiar

Copy recomendado:
“Link copiado. Pegalo en el grupo de WhatsApp.”

---

## Responsive

### Mobile

- imagen full screen
- card inferior
- CTA grande
- inputs full width
- contenido corto

### Desktop

- imagen full screen
- card centrada o lateral
- max-width razonable
- evitar pantallas vacías

---

## Performance

- usar imágenes optimizadas
- evitar imágenes pesadas sin compresión
- preferir WebP
- no agregar librerías visuales pesadas sin justificación
- no abusar de blur/backdrop-filter

---

## Accesibilidad

- contraste mínimo AA
- labels visibles
- errores asociados con `aria-describedby`
- botones con texto claro
- no depender solo del color

---

## Regla para Codex

Cuando implementes UI nueva:

1. Leer este archivo.
2. Aplicar el patrón:
   - background image
   - dark overlay
   - functional card
   - one primary CTA
3. No inventar un sistema visual nuevo.
4. No agregar dependencias de UI sin aprobación.
