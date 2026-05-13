export type NotificationType =
  | 'event_created'
  | 'event_cancelled'
  | 'event_rescheduled'
  | 'event_updated'
  | 'attendance_changed'
  | 'someone_dropped'
  | 'owner_temporary_assigned'
  | 'owner_assigned'
  | 'owner_removed'
  | 'owner_temporary_accepted'
  | 'owner_temporary_rejected'
  | 'owner_temporary_no_one_accepted'
  | 'stats_pending_approval'
  | 'stats_approved'
  | 'stats_revision_requested'
  | 'stats_revision_resolved'
  | 'stats_changed_log'
  | 'player_returned'
  | 'reintegration_request'
  | 'reintegration_approved'
  | 'reintegration_rejected'
  | 'match_ready'
  | 'mvp_awarded'
  | 'boost_applied'
  | 'weekly_digest';

export type NotificationPayload = {
  group_id?: string;
  event_id?: string;
  player_id?: string;
  request_id?: string;
  player_name?: string;
  group_name?: string;
  [key: string]: unknown;
};

export function getNotificationDeepLink(
  type: NotificationType,
  payload: NotificationPayload,
): string {
  const { group_id, event_id, player_id, request_id } = payload;

  switch (type) {
    case 'event_created':
    case 'event_rescheduled':
    case 'event_cancelled':
    case 'event_updated':
    case 'someone_dropped':
    case 'mvp_awarded':
    case 'attendance_changed':
      return group_id && event_id ? `/groups/${group_id}/events/${event_id}` : '/';

    case 'match_ready':
      return group_id && event_id ? `/groups/${group_id}/events/${event_id}/teams` : '/';

    case 'stats_pending_approval':
      return group_id ? `/groups/${group_id}/admin-tasks` : '/';

    case 'stats_approved':
    case 'stats_revision_resolved':
    case 'boost_applied':
      return group_id && player_id ? `/groups/${group_id}/players/${player_id}` : '/';

    case 'stats_revision_requested':
      return group_id && request_id
        ? `/groups/${group_id}/admin-tasks/revisions/${request_id}`
        : '/';

    case 'stats_changed_log':
      return group_id ? `/groups/${group_id}/feed` : '/';

    case 'owner_assigned':
    case 'owner_removed':
    case 'owner_temporary_accepted':
    case 'owner_temporary_rejected':
    case 'owner_temporary_no_one_accepted':
    case 'player_returned':
    case 'reintegration_approved':
      return group_id ? `/groups/${group_id}/dashboard` : '/';

    case 'owner_temporary_assigned':
      return event_id ? `/temporary-owner/${event_id}` : '/';

    case 'reintegration_request':
      return group_id && request_id
        ? `/groups/${group_id}/admin-tasks/reintegrations/${request_id}`
        : '/';

    case 'reintegration_rejected':
      return '/dashboard';

    case 'weekly_digest':
      return '/groups';

    default:
      return '/';
  }
}

export function getNotificationCopy(
  type: NotificationType,
  payload: NotificationPayload,
): { title: string; body: string } {
  const name = payload.player_name ?? 'Alguien';
  const group = payload.group_name ?? 'tu grupo';

  switch (type) {
    case 'event_created':
      return { title: 'Nuevo partido', body: `Se creó un partido en ${group}.` };
    case 'event_cancelled':
      return { title: 'Partido cancelado', body: `Se canceló el partido en ${group}.` };
    case 'event_rescheduled':
      return { title: 'Partido reprogramado', body: 'Cambiaron la fecha del partido.' };
    case 'event_updated':
      return { title: 'Partido actualizado', body: 'Actualizaron la info del partido.' };
    case 'someone_dropped':
      return { title: 'Se bajó alguien', body: `${name} se bajó del partido.` };
    case 'match_ready':
      return { title: 'Equipos listos', body: 'El sorteo está hecho, mirá los equipos.' };
    case 'mvp_awarded':
      return { title: '¡MVP!', body: `${name} fue el MVP del partido.` };
    case 'boost_applied':
      return { title: 'Boost aplicado', body: 'Te aplicaron un boost por el partido.' };
    case 'stats_pending_approval':
      return { title: 'Carta para aprobar', body: `${name} cargó sus stats. Revisala.` };
    case 'stats_approved':
      return { title: 'Carta aprobada', body: 'El admin aprobó tus stats.' };
    case 'stats_revision_requested':
      return { title: 'Pedido de revisión', body: `${name} pidió revisar sus stats.` };
    case 'stats_revision_resolved':
      return { title: 'Revisión resuelta', body: 'Tu pedido de revisión fue resuelto.' };
    case 'stats_changed_log':
      return { title: 'Stats actualizadas', body: 'El admin actualizó tus stats.' };
    case 'owner_assigned':
      return { title: 'Sos owner', body: `Te asignaron como owner en ${group}.` };
    case 'owner_removed':
      return { title: 'Ya no sos owner', body: `Te quitaron el rol de owner en ${group}.` };
    case 'owner_temporary_assigned':
      return { title: 'Owner temporal', body: 'Te invitaron a ser owner temporal.' };
    case 'owner_temporary_accepted':
      return { title: 'Owner temporal confirmado', body: `${name} aceptó ser owner temporal.` };
    case 'owner_temporary_rejected':
      return { title: 'Owner temporal rechazado', body: `${name} rechazó ser owner temporal.` };
    case 'owner_temporary_no_one_accepted':
      return { title: 'Sin owner temporal', body: 'Nadie aceptó ser owner temporal.' };
    case 'player_returned':
      return { title: '¡Volvió!', body: `${name} volvió al grupo.` };
    case 'reintegration_request':
      return { title: 'Pedido de reintegro', body: `${name} quiere volver.` };
    case 'reintegration_approved':
      return { title: 'Reintegro aprobado', body: 'Tu pedido de reintegro fue aprobado.' };
    case 'reintegration_rejected':
      return { title: 'Reintegro rechazado', body: 'Tu pedido de reintegro fue rechazado.' };
    case 'attendance_changed':
      return { title: 'Asistencia actualizada', body: `${name} actualizó su asistencia.` };
    case 'weekly_digest':
      return { title: 'Resumen semanal', body: 'Mirá lo que pasó esta semana.' };
    default:
      return { title: 'El Fulbo', body: 'Tenés una notificación nueva.' };
  }
}
