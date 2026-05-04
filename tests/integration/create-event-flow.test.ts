import request from 'supertest';
import app from '../../src/app'; // Assuming your express app is exported from src/app.ts
import { setupTestDatabase, tearDownTestDatabase } from '../helpers/database';
import { createUser, createEvent, loginUser } from '../helpers/auth';
import { UserRole } from '../../src/types/user';

describe('Event Creation Flow Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await tearDownTestDatabase();
  });

  it('should allow an Admin to create an event and notify approved players, but not pending players', async () => {
    const adminUser = await createUser('admin@example.com', 'password123', UserRole.ADMIN);
    const approvedPlayer = await createUser('approved@example.com', 'password123', UserRole.PLAYER);
    const pendingPlayer = await createUser('pending@example.com', 'password123', UserRole.PLAYER, { status: 'pending' });

    const adminToken = await loginUser(adminUser.email, 'password123');

    const eventData = {
      name: 'Admin Created Event',
      description: 'An event created by an admin.',
      date: new Date().toISOString(),
      location: 'Admin Arena',
      delivery_strategy: 'auto-chain',
      skipLocalDbVerification: true, // Assuming this flag is passed in the request body
      // Add other necessary event fields
    };

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(eventData)
      .expect(201);

    expect(res.body.event).toHaveProperty('id');
    expect(res.body.event.name).toBe(eventData.name);
    // Add more assertions for event properties

    // TODO: Verify notifications for approvedPlayer
    // This would typically involve checking a notification service mock or a database table
    console.log('TODO: Verify notification for approvedPlayer');

    // TODO: Verify NO notifications for pendingPlayer
    console.log('TODO: Verify NO notification for pendingPlayer');
  });

  it('should allow an Owner to create an event', async () => {
    const ownerUser = await createUser('owner@example.com', 'password123', UserRole.OWNER);
    const ownerToken = await loginUser(ownerUser.email, 'password123');

    const eventData = {
      name: 'Owner Created Event',
      description: 'An event created by an owner.',
      date: new Date().toISOString(),
      location: 'Owner HQ',
      delivery_strategy: 'auto-chain',
      skipLocalDbVerification: true,
      // Add other necessary event fields
    };

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(eventData)
      .expect(201);

    expect(res.body.event).toHaveProperty('id');
    expect(res.body.event.name).toBe(eventData.name);
    // Add more assertions for event properties
  });

  it('should FORBID a regular Player from creating an event', async () => {
    const regularPlayer = await createUser('player@example.com', 'password123', UserRole.PLAYER);
    const playerToken = await loginUser(regularPlayer.email, 'password123');

    const eventData = {
      name: 'Player Created Event (Forbidden)',
      description: 'A regular player trying to create an event.',
      date: new Date().toISOString(),
      location: 'Player Den',
      delivery_strategy: 'auto-chain',
      skipLocalDbVerification: true,
      // Add other necessary event fields
    };

    await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${playerToken}`)
      .send(eventData)
      .expect(403); // Forbidden
  });
});
