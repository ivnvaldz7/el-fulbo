# Convocatorias compartidas de Grupos

## Propósito

Un grupo puede sostener una única convocatoria semanal desde un enlace fijo de WhatsApp. Las personas con cuenta confirman como siempre. Quienes no tienen cuenta pueden reservar con un apodo, quedar en la misma lista y entrar al sorteo si el admin las marca presentes.

## Requisitos

- Cada grupo tiene un enlace público no predecible que resuelve su convocatoria abierta más cercana. Si no hay convocatoria abierta, muestra ese estado.
- La página del enlace muestra día, hora, cancha, cupos, contador de días y personas anotadas.
- Un visitante sin sesión puede reservar con un apodo entre 2 y 40 caracteres. Su navegador puede bajar o actualizar esa reserva.
- La reserva externa usa el mismo límite y lista de espera que las asistencias de los miembros.
- El admin puede agregar un invitado manualmente desde el check-in. Los invitados se muestran y pueden ser marcados presentes para entrar al sorteo.
- Un evento recurrente guarda el schedule que lo originó y la hora exacta de su ocurrencia. Sólo puede existir uno para esa combinación.
- El admin puede abrir manualmente la próxima ocurrencia de un schedule aunque esté fuera de la anticipación configurada. La tarea automática reutiliza ese mismo evento y no duplica avisos ni listas.
- La card del MVP aparece hasta que se juega un partido posterior o hasta siete días después de su partido.
- El enlace de votación MVP abre una vista directa de votación. Los miembros autenticados votan con la regla actual. Un invitado que fue marcado presente puede votar desde el navegador donde reservó.
- La votación continúa limitada a las 24 horas posteriores al partido y permite un voto por participante.

## Escenarios

1. Un admin abre una convocatoria con diez días de anticipación. Cuando corre el mantenimiento al llegar a la ventana, conserva el mismo evento y sus anotados.
2. Un invitado reserva con un apodo. Si el cupo se completó, entra en espera. Al bajarse alguien, se respeta el orden de llegada.
3. El admin agrega o confirma un invitado y lo incluye en el sorteo con los asistentes presentes.
4. El dashboard deja de mostrar el MVP si ya se jugó un partido posterior o pasaron siete días desde el partido destacado.
5. Un invitado marcado presente abre el link de MVP desde el mismo navegador y emite un único voto durante la ventana habilitada.
