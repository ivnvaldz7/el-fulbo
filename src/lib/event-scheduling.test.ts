import { describe, expect, it } from 'vitest';
import {
  getMinimumEventDateTime,
  isCreateEventDateTimeAllowed,
  sanitizeCreateEventDraft,
} from './event-scheduling';

describe('event scheduling', () => {
  it('starts new events at least one hour from now', () => {
    const now = new Date('2026-07-08T10:30:20');

    expect(getMinimumEventDateTime(now)).toEqual({
      dateString: '2026-07-08',
      timeString: '11:30',
    });
  });

  it('rejects draft dates that are less than one hour away', () => {
    const now = new Date('2026-07-08T10:30:00');

    expect(isCreateEventDateTimeAllowed('2026-07-08', '11:29', now)).toBe(false);
    expect(isCreateEventDateTimeAllowed('2026-07-08', '11:30', now)).toBe(true);
  });

  it('keeps draft details but replaces expired date and time', () => {
    const now = new Date('2026-07-08T10:30:00');

    expect(
      sanitizeCreateEventDraft(
        {
          date: '2026-06-30',
          time: '20:00',
          modality: 'F5',
          locationName: 'Cancha vieja',
          googleMapsLink: 'https://maps.app.goo.gl/abc',
          notes: 'Traer pecheras',
        },
        now,
      ),
    ).toEqual({
      date: '2026-07-08',
      time: '11:30',
      modality: 'F5',
      locationName: 'Cancha vieja',
      googleMapsLink: 'https://maps.app.goo.gl/abc',
      notes: 'Traer pecheras',
    });
  });
});
