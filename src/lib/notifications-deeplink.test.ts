import { describe, it, expect } from 'vitest';
import { getNotificationDeepLink, getNotificationCopy } from './notifications-deeplink';

const BASE = {
  group_id: 'g1',
  event_id: 'e1',
  player_id: 'p1',
  request_id: 'r1',
  player_name: 'Messi',
  group_name: 'Los Pibes',
};

describe('getNotificationDeepLink', () => {
  it('event_created links to event page', () => {
    expect(getNotificationDeepLink('event_created', BASE)).toBe('/groups/g1/events/e1');
  });

  it('stats_pending_approval links to admin-tasks', () => {
    expect(getNotificationDeepLink('stats_pending_approval', BASE)).toBe('/groups/g1/admin-tasks');
  });

  it('stats_revision_requested links to revision detail', () => {
    expect(getNotificationDeepLink('stats_revision_requested', BASE)).toBe(
      '/groups/g1/admin-tasks/revisions/r1',
    );
  });

  it('stats_approved links to player profile', () => {
    expect(getNotificationDeepLink('stats_approved', BASE)).toBe('/groups/g1/players/p1');
  });

  it('owner_temporary_assigned links to temp-owner accept page', () => {
    expect(getNotificationDeepLink('owner_temporary_assigned', BASE)).toBe('/temporary-owner/e1');
  });

  it('reintegration_request links to reintegration detail', () => {
    expect(getNotificationDeepLink('reintegration_request', BASE)).toBe(
      '/groups/g1/admin-tasks/reintegrations/r1',
    );
  });

  it('reintegration_rejected links to dashboard', () => {
    expect(getNotificationDeepLink('reintegration_rejected', BASE)).toBe('/dashboard');
  });

  it('weekly_digest links to groups', () => {
    expect(getNotificationDeepLink('weekly_digest', BASE)).toBe('/groups');
  });

  it('match_ready links to teams page', () => {
    expect(getNotificationDeepLink('match_ready', BASE)).toBe('/groups/g1/events/e1/teams');
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

  it('uses player name in stats_pending_approval body', () => {
    const copy = getNotificationCopy('stats_pending_approval', BASE);
    expect(copy.body).toContain('Messi');
  });

  it('falls back gracefully on unknown type', () => {
    const copy = getNotificationCopy('weekly_digest', {});
    expect(copy.title).toBeTruthy();
    expect(copy.body).toBeTruthy();
  });
});
