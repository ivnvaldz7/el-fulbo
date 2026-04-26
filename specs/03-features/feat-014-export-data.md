# feat-014 — Export de datos

## Objetivo

Permitir al Admin u Owner descargar un backup completo del grupo (roster, eventos, stats, histórico) en formatos JSON y CSV. Es una protección contra un admin tóxico y una garantía de portabilidad para los usuarios.

---

## Referencias

- **Flows:** [`core-flows.md`](../02-flows/core-flows.md) §Flow 17 (Exportar datos).
- **Reglas:** implícito en `business-rules.md` (principio de portabilidad).
- **Decisiones del engram:** `dec-017`, `dec-138` a `dec-140`.

---

## Alcance

### Incluye

- Sección "Exportar datos" en settings del grupo.
- Generación de ZIP con múltiples archivos (JSON + CSV).
- Inclusión de: roster, eventos, participations, stat_change_logs.
- Anonimización de emails de otros Players (excepto para el Admin).
- Descarga directa al device.
- Disponible para Admin y Owners.

### No incluye

- Export automático periódico (sin cronjob auto).
- Export selectivo (todo o nada en MVP).
- Import desde otro grupo/sistema (fuera de MVP).
- Compartir el export con terceros (el usuario lo hace por su cuenta).
- Estadísticas agregadas o reportes PDF.

---

## Flujo

### Etapa 1 — Entrada

**Ruta:** `/groups/{id}/settings/export`

**Permisos:** Admin y Owners.

**UI:**

- Header: *"Exportar datos"*.
- Subtítulo: *"Descargá todos los datos del grupo en un ZIP. Incluye jugadores, partidos, stats e historial."*
- Lista de qué incluye:
  - ✅ Roster completo (nombres, posiciones, stats actuales).
  - ✅ Historia de partidos (fechas, resultados, MVPs).
  - ✅ Participaciones por partido (quién jugó en qué equipo).
  - ✅ Log de cambios de stats.
- Aclaración chica: *"Por privacidad, los emails de los jugadores no se incluyen salvo el tuyo."*
- Botón grande: *"Generar y descargar"*.

### Etapa 2 — Generación

**Al tocar "Generar y descargar":**

1. Frontend llama a Edge Function `export-group-data(group_id)`.
2. La function:
   - Valida permisos (admin u owner del grupo).
   - Consulta todas las tablas relacionadas:
     - `groups`, `players`, `events`, `event_attendances`, `match_participations`, `player_stat_change_logs`, `stat_revision_requests`, `reintegration_requests`, `temporary_owners`.
   - Arma 3 niveles de output:
     - **JSON estructurado**: archivo por tabla + un `metadata.json` con info del grupo.
     - **CSV flat**: un CSV por tabla para análisis en Excel.
     - **README.txt**: descripción del contenido y cómo leerlo.
3. Retorna blob ZIP al cliente.
4. Cliente ejecuta descarga automática: `nombre-del-grupo-2026-04-23.zip`.

### Contenido del ZIP

```
nombre-del-grupo-2026-04-23/
├── README.txt
├── metadata.json
├── json/
│   ├── group.json
│   ├── roster.json
│   ├── events.json
│   ├── attendances.json
│   ├── participations.json
│   ├── stat_change_logs.json
│   ├── revision_requests.json
│   └── reintegration_requests.json
├── csv/
│   ├── roster.csv
│   ├── events.csv
│   ├── participations.csv
│   └── stat_change_logs.csv
└── LICENSE.txt
```

**`README.txt` contenido:**

```
El Fulbo — Export de datos
Grupo: {nombre}
Fecha de export: 2026-04-23 15:32
Generado por: {nombre del admin/owner}

Este ZIP contiene todos los datos de tu grupo en El Fulbo.

Estructura:
- /json/: archivos JSON estructurados, uno por tabla.
- /csv/: mismos datos en formato CSV para análisis en Excel/Sheets.
- metadata.json: info general del grupo.

Privacidad:
- Se excluyen los emails de otros jugadores (salvo el tuyo).
- Se excluyen los IDs internos de usuarios para reducir correlación.

Preguntas: ivnvldz7@gmail.com
```

**`metadata.json` contenido:**

```json
{
  "exportVersion": "1.0",
  "exportedAt": "2026-04-23T15:32:00Z",
  "exportedBy": "Juan Pérez",
  "group": {
    "id": "...",
    "name": "...",
    "modality": "F5",
    "createdAt": "...",
    "playersCount": 15,
    "eventsCount": 42
  }
}
```

### Anonimización

**Lo que se anonimiza en el export:**
- `users.email` → se incluye SOLO el del User que exporta, si es Admin. Si es Owner, ni el suyo.
- `users.id` → se reemplaza por un ID secuencial por export (`user_1`, `user_2`, ...).
- Logs con `changed_by_user_id` → se reemplazan con la referencia anonimizada.

**Lo que NO se anonimiza:**
- `display_name` de los Players (es nombre público del grupo).
- Stats, posiciones, resultados, participations (info funcional del grupo).
- Fechas.

---

## Implementación (Edge Function)

```ts
// supabase/functions/export-group-data/index.ts
import JSZip from 'jszip';
import { parse as stringifyCSV } from 'csv-stringify/sync';

export async function handler(req: Request): Promise<Response> {
  const { groupId } = await req.json();
  const userId = getUserIdFromJWT(req);

  // 1. Validar permisos
  const isAdminOrOwner = await checkPermissions(userId, groupId);
  if (!isAdminOrOwner) {
    return new Response('Forbidden', { status: 403 });
  }

  // 2. Fetch all data
  const data = await fetchAllGroupData(groupId);

  // 3. Anonymize
  const anonymized = anonymizeData(data, userId);

  // 4. Build ZIP
  const zip = new JSZip();
  zip.file('README.txt', generateReadme(anonymized));
  zip.file('metadata.json', JSON.stringify(anonymized.metadata, null, 2));

  const jsonFolder = zip.folder('json');
  for (const [key, value] of Object.entries(anonymized.tables)) {
    jsonFolder.file(`${key}.json`, JSON.stringify(value, null, 2));
  }

  const csvFolder = zip.folder('csv');
  const csvTables = ['roster', 'events', 'participations', 'stat_change_logs'];
  for (const t of csvTables) {
    csvFolder.file(`${t}.csv`, stringifyCSV(anonymized.tables[t], { header: true }));
  }

  zip.file('LICENSE.txt', LICENSE);

  // 5. Return blob
  const blob = await zip.generateAsync({ type: 'uint8array' });
  return new Response(blob, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slugify(groupName)}-${date}.zip"`,
    },
  });
}
```

---

## Edge cases

| Caso | Comportamiento |
|------|----------------|
| Group con 50 players y 100 eventos | Export suele ser <5MB, se genera en 2-5 segundos. |
| Group con 1 solo player (recién creado) | Export válido, archivos mayormente vacíos. |
| Admin intenta exportar grupo archivado | Permitido (dentro de los 30 días de archive). Útil si el grupo va a morir. |
| Owner exporta, después el admin le remueve el rol | El export ya descargado queda fuera de nuestro alcance. Estado válido al momento. |
| Usuario cancela la descarga a mitad | No queda rastro. Puede reintentar. |
| Generación falla (error de DB, timeout) | Toast de error, logs a Sentry, no se sirve archivo parcial. |
| Export contiene 10,000 registros en una tabla (raro) | Sin problema, JSON/CSV soportan tamaño. |
| User con Adblocker/extensión que bloquea descargas | Fallback: mostrar URL del blob en una modal para que el usuario la abra manualmente. |

---

## Validaciones

- Validar permisos server-side (admin u owner).
- No se permite export desde fuera del grupo.

---

## Tests

### Unit
- `anonymizeData` reemplaza emails correctamente.
- `generateReadme` produce texto válido.
- CSV generation con campos especiales (comas, quotes) funciona.

### Integration
- Admin exporta, recibe ZIP con contenido correcto.
- Owner exporta, email propio NO incluido (anonimizado).
- Non-admin non-owner intenta → 403.

---

## Copy

- Header: *"Exportar datos"*
- Subtítulo: *"Descargá todos los datos del grupo en un ZIP. Incluye jugadores, partidos, stats e historial."*
- Lista contenidos:
  - *"Roster completo (nombres, posiciones, stats actuales)"*
  - *"Historia de partidos (fechas, resultados, MVPs)"*
  - *"Participaciones por partido (quién jugó en qué equipo)"*
  - *"Log de cambios de stats"*
- Aclaración: *"Por privacidad, los emails de los jugadores no se incluyen salvo el tuyo."*
- Botón: *"Generar y descargar"*
- Toast éxito: *"Descarga iniciada"*
- Toast error: *"No pudimos generar el export. Reintentá."*

---

## Criterios de aceptación

- [ ] Admin y Owners pueden acceder a `/groups/{id}/settings/export`.
- [ ] Players regulares no ven la sección.
- [ ] Tap en "Generar" produce ZIP válido.
- [ ] ZIP tiene README, metadata, carpetas json/ y csv/.
- [ ] Anonimización aplicada: emails ajenos ocultos, IDs internos reemplazados.
- [ ] CSV abrible en Excel sin problemas.
- [ ] Tamaño esperado < 5MB para grupos típicos.
- [ ] Tests pasan.
