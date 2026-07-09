import { routes } from './routes';

export type NotificationType =
  | 'event_created'
  | 'attendance_changed'
  | 'attendance_reminder'
  | 'event_cancelled'
  | 'event_rescheduled'
  | 'event_updated'
  | 'boost_applied'
  | 'mvp_awarded'
  | 'match_result_loaded';

export type NotificationPayload = {
  group_id?: string;
  event_id?: string;
  player_id?: string;
  scheduled_at?: string;
  field_name?: string;
  request_id?: string;
  player_name?: string;
  group_name?: string;
  [key: string]: unknown;
};

export function getNotificationDeepLink(
  type: NotificationType,
  payload: NotificationPayload,
): string {
  const { group_id, event_id, player_id } = payload;

  switch (type) {
    case 'event_created':
    case 'attendance_changed':
    case 'attendance_reminder':
    case 'event_rescheduled':
    case 'event_cancelled':
    case 'event_updated':
    case 'mvp_awarded':
      return group_id && event_id ? routes.groupEvent(group_id, event_id) : routes.home;

    case 'boost_applied':
      return group_id && player_id ? routes.groupPlayer(group_id, player_id) : routes.home;

    case 'match_result_loaded':
      return group_id && event_id ? routes.groupEvent(group_id, event_id) : routes.home;

    default:
      return routes.home;
  }
}

export function getNotificationCopy(
  type: NotificationType,
  payload: NotificationPayload,
): { title: string; body: string } {
  const group = payload.group_name ?? 'tu grupo';

  switch (type) {
    case 'event_created':
      return { title: 'Nuevo partido', body: `Se creó un partido en ${group}.` };
    case 'attendance_changed': {
      const player = typeof payload.player_name === 'string' ? payload.player_name : 'Un jugador';
      if (payload.status === 'going') {
        return { title: 'Asistencia confirmada', body: `${player} confirmó que va.` };
      }

      if (payload.status === 'not_going') {
        return { title: 'Baja confirmada', body: `${player} avisó que no va.` };
      }

      return { title: 'Asistencia actualizada', body: `${player} actualizó su asistencia.` };
    }
    case 'attendance_reminder':
      return { title: 'Recordatorio de asistencia', body: `Todavía no confirmaste asistencia en ${group}.` };
    case 'event_cancelled':
      return { title: 'Partido cancelado', body: `Se canceló el partido en ${group}.` };
    case 'event_rescheduled':
      return { title: 'Partido reprogramado', body: 'Cambiaron la fecha del partido.' };
    case 'event_updated':
      return { title: 'Partido actualizado', body: 'Actualizaron la info del partido.' };
    case 'mvp_awarded':
      return { title: '¡MVP!', body: `${payload.player_name ?? 'Alguien'} fue el MVP del partido.` };
    case 'boost_applied':
      return { title: 'Boost aplicado', body: 'Te aplicaron un boost por el partido.' };
    case 'match_result_loaded':
      return { title: 'Resultado cargado', body: `Se cargó el resultado del partido en ${group}.` };
    default:
      return { title: 'El Fulbo', body: 'Tenés una notificación nueva.' };
  }
}
