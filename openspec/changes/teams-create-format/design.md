# Diseño

- `CreateTeamForm` reemplaza la selección de posición por la selección de modalidad.
- `createTeamSchema` valida la modalidad contra los formatos soportados.
- `TeamsService.createTeam` envía `p_modality` al RPC.
- El RPC `create_team` exige que exista `team_cards` para el usuario autenticado, usa sus posiciones y crea el primer `team_member` con esos valores.
- `teams.modality` conserva el formato elegido para mostrarlo y usarlo en futuras reglas del equipo.
- Los equipos existentes reciben F5 como valor de compatibilidad al aplicar la migración.
