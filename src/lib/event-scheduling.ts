import type { CreateEventData } from './validations/event';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toDateInputValue(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function toTimeInputValue(value: Date) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function getMinimumEventDateTime(now = new Date()) {
  const minimum = new Date(now.getTime() + 60 * 60 * 1000);
  minimum.setSeconds(0, 0);

  return {
    dateString: toDateInputValue(minimum),
    timeString: toTimeInputValue(minimum),
  };
}

export function isCreateEventDateTimeAllowed(date: string | undefined, time: string | undefined, now = new Date()) {
  if (!date || !time) return false;

  const scheduledAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(scheduledAt.getTime())) return false;

  return scheduledAt.getTime() >= now.getTime() + 60 * 60 * 1000;
}

export function sanitizeCreateEventDraft(draft: Partial<CreateEventData>, now = new Date()) {
  if (isCreateEventDateTimeAllowed(draft.date, draft.time, now)) {
    return draft;
  }

  const minimum = getMinimumEventDateTime(now);

  return {
    ...draft,
    date: minimum.dateString,
    time: minimum.timeString,
  };
}
