export type NotificationType =
  | 'event_created'
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
    case 'event_rescheduled':
    case 'event_cancelled':
    case 'event_updated':
    case 'mvp_awarded':
      return group_id && event_id ? `/groups/${group_id}/events/${event_id}` : '/';

    case 'boost_applied':
      return group_id && player_id ? `/groups/${group_id}/players/${player_id}` : '/';

    case 'match_result_loaded':
      return group_id && event_id ? `/groups/${group_id}/events/${event_id}` : '/';

    default:
      return '/';
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
