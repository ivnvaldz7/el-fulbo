import { describe, expect, it } from 'vitest';
import { routes } from './routes';

describe('routes', () => {
  it('builds the group dashboard route', () => {
    expect(routes.groupDashboard('group-1')).toBe('/groups/group-1/dashboard');
  });

  it('builds the MVP voting entrypoint on the event route', () => {
    expect(routes.groupEventMvpVote('group-1', 'event-1')).toBe(
      '/groups/group-1/events/event-1?votar-mvp=event-1',
    );
  });

  it('builds player card routes', () => {
    expect(routes.groupPlayer('group-1', 'player-1')).toBe('/groups/group-1/players/player-1');
    expect(routes.groupPlayerEditCard('group-1', 'player-1')).toBe(
      '/groups/group-1/players/player-1/edit-card',
    );
  });
});
