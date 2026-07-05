import { describe, it, expect } from 'vitest';
import { getNotificationDeepLink, getNotificationCopy } from './notifications-deeplink';

const BASE = {
  group_id: 'g1',
  event_id: 'e1',
  player_id: 'p1',
  player_name: 'Messi',
  group_name: 'Los Pibes',
};

describe('getNotificationDeepLink', () => {
  it('event_created links to event page', () => {
    expect(getNotificationDeepLink('event_created', BASE)).toBe('/groups/g1/events/e1');
  });

  it('attendance_reminder links to event page', () => {
    expect(getNotificationDeepLink('attendance_reminder', BASE)).toBe('/groups/g1/events/e1');
  });

  it('mvp_awarded links to event page', () => {
    expect(getNotificationDeepLink('mvp_awarded', BASE)).toBe('/groups/g1/events/e1');
  });

  it('boost_applied links to player profile', () => {
    expect(getNotificationDeepLink('boost_applied', BASE)).toBe('/groups/g1/players/p1');
  });

  it('returns / when required payload fields are missing', () => {
    expect(getNotificationDeepLink('event_created', {})).toBe('/');
  });
});

describe('getNotificationCopy', () => {
  it('returns title and body for event_created', () => {
    const copy = getNotificationCopy('event_created', BASE);
    expect(copy.title).toBe('Nuevo partido');
    expect(copy.body).toContain('Los Pibes');
  });

  it('mvp_awarded includes player name', () => {
    const copy = getNotificationCopy('mvp_awarded', BASE);
    expect(copy.body).toContain('Messi');
  });

  it('falls back gracefully', () => {
    const copy = getNotificationCopy('event_cancelled', {});
    expect(copy.title).toBeTruthy();
    expect(copy.body).toBeTruthy();
  });
});
