# Navegación y carga de Equipos

## Propósito

El hub de Equipos sirve para encontrar un equipo y entrar a su actividad. La identidad y progresión global del jugador viven en un perfil propio, separado del listado de equipos.

## Requisitos

- El hub muestra qué distingue a Equipos de Grupos: plantel fijo, partidos del equipo y estadísticas oficiales aprobadas.
- La entrada de la app muestra Grupos y Equipos para cualquier usuario autenticado, aunque todavía no tenga una ficha de Grupos.
- Cada equipo muestra identidad, modalidad, cantidad de miembros y resumen de partidos y estadísticas. El hub ofrece crear un equipo y abrir el perfil de jugador.
- El perfil de jugador muestra la card global, rendimiento aprobado, aptitudes, logros y acceso a la edición de la card y las recompensas.
- Abrir el hub no consulta los agregados de la card global.
- El detalle consulta los partidos y cargas propias solo en Partidos, las admisiones solo en Card y las cargas a moderar solo en Moderación. La cabecera conserva membresía y totales en todas las pestañas.
- Volver a una pestaña visitada recientemente reutiliza datos mientras no haya una mutación o cambio en tiempo real.
- La portada usa cards de igual estructura y altura para Grupos y Equipos y un movimiento ambiental tenue que respeta movimiento reducido.
- Los administradores eligen uno de cuatro escudos al crear el equipo o desde el detalle. El escudo conserva su proporción en el hub, cabecera y card compartible.
- La navegación del detalle usa iconos con nombres accesibles.
- La portada identifica Grupos como «El Fulbo entre amigos» y Equipos como «El Fulbo titular». Ambas cards conservan el mismo diseño gris y un acceso con flecha.
- El hub de Grupos muestra navegación a Inicio, Grupos y Equipos. En el detalle de equipo, el regreso queda fuera de la cabecera y los iconos ocupan todo el ancho disponible en móvil.

## Escenarios

1. Un jugador abre Equipos y encuentra primero sus equipos, con una explicación breve de la sección y un acceso a su perfil.
2. Un jugador abre su perfil y ve la card global y su progresión sin recorrer el listado de equipos.
3. Un jugador abre Miembros o Stats y el detalle no consulta partidos, cargas de stats ni snapshots de admisión.
4. Un admin abre Moderación y ve las cargas pendientes; un miembro común no accede a ellas.
5. Una mutación o un evento de tiempo real invalida los datos del equipo para que el siguiente acceso muestre el estado actual.
