import toast from 'react-hot-toast';

type EventNotificationType =
  | 'event_created'
  | 'event_rescheduled'
  | 'event_updated'
  | 'event_cancelled';

interface EventNotificationData {
  eventName: string;
}

export const showEventNotification = (
  type: EventNotificationType,
  data: EventNotificationData
) => {
  const { eventName } = data;

  switch (type) {
    case 'event_created':
      toast.success(`🎉 El evento "${eventName}" fue creado con éxito.`);
      break;
    case 'event_rescheduled':
      toast(`🗓️ El evento "${eventName}" ha sido reprogramado.`, {
        icon: '🗓️',
      });
      break;
    case 'event_updated':
      toast(`✏️ El evento "${eventName}" ha sido actualizado.`, {
        icon: '✏️',
      });
      break;
    case 'event_cancelled':
      toast.error(`🗑️ El evento "${eventName}" ha sido cancelado.`);
      break;
    default:
      toast(`Unhandled event type: ${type}`);
  }
};
