import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

describe('feat-001 RLS', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('user can update own pending player stats', async () => {
    const admin = await seedUser(client, 'admin-rls-own');
    const user = await seedUser(client, 'player-rls-own');
    const group = await seedGroup(client, admin.id);
    const accepted = await asUser(client, user.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );
    const submitted = await asUser(client, user.id, () =>
      client.query(
        `
          select * from public.submit_onboarding_stats(
            $1,
            'MED',
            null,
            '{"pac":50,"sho":50,"pas":50,"dri":50,"def":50,"phy":50}'::jsonb
          )
        `,
        [group.id],
      ),
    );

    const updated = await asUser(client, user.id, () =>
      client.query(
        `
          update public.players
          set stats = '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb
          where id = $1
          returning id
        `,
        [submitted.rows[0].player_id],
      ),
    );

    expect(updated.rowCount).toBe(1);
  });

  it('user cannot update own approved player stats', async () => {
    const admin = await seedUser(client, 'admin-rls-approved');
    const user = await seedUser(client, 'player-rls-approved');
    const group = await seedGroup(client, admin.id);
    const accepted = await asUser(client, user.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );
    const submitted = await asUser(client, user.id, () =>
      client.query(
        `
          select * from public.submit_onboarding_stats(
            $1,
            'MED',
            null,
            '{"pac":50,"sho":50,"pas":50,"dri":50,"def":50,"phy":50}'::jsonb
          )
        `,
        [group.id],
      ),
    );

    await client.query(`update public.players set stats_status = 'approved' where id = $1`, [
      submitted.rows[0].player_id,
    ]);

    const updated = await asUser(client, user.id, () =>
      client.query(
        `
          update public.players
          set stats = '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb
          where id = $1
          returning id
        `,
        [submitted.rows[0].player_id],
      ),
    );

    expect(updated.rowCount).toBe(0);
  });

  it('user cannot update another pending player stats', async () => {
    const admin = await seedUser(client, 'admin-rls-other');
    const userA = await seedUser(client, 'player-rls-a');
    const userB = await seedUser(client, 'player-rls-b');
    const group = await seedGroup(client, admin.id);
    const acceptedB = await asUser(client, userB.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );
    const submittedB = await asUser(client, userB.id, () =>
      client.query(
        `
          select * from public.submit_onboarding_stats(
            $1,
            'MED',
            null,
            '{"pac":50,"sho":50,"pas":50,"dri":50,"def":50,"phy":50}'::jsonb
          )
        `,
        [group.id],
      ),
    );

    const updated = await asUser(client, userA.id, () =>
      client.query(
        `
          update public.players
          set stats = '{"pac":6,"sho":6,"pas":6,"dri":6,"def":6,"phy":6}'::jsonb
          where id = $1
          returning id
        `,
        [submittedB.rows[0].player_id],
      ),
    );

    expect(updated.rowCount).toBe(0);
  });
});

describe('Event RLS Policies', () => {
  let client: Client;
  let admin: { id: string };
  let group: { id: string; inviteCode: string };
  let member: { id: string };
  let nonMember: { id: string };
  let eventId: string;

  beforeAll(async () => {
    client = await createDbClient();

    // Seed users and group
    admin = await seedUser(client, 'admin-event-rls');
    member = await seedUser(client, 'member-event-rls');
    nonMember = await seedUser(client, 'non-member-event-rls');
    group = await seedGroup(client, admin.id);

    // Make 'member' a group member
    await asUser(client, member.id, () =>
      client.query(`select * from public.accept_invite_for_user($1)`, [group.inviteCode]),
    );
    await asUser(client, member.id, () =>
      client.query(
        `
          select * from public.submit_onboarding_stats(
            $1,
            'MED',
            null,
            '{"pac":50,"sho":50,"pas":50,"dri":50,"def":50,"phy":50}'::jsonb
          )
        `,
        [group.id],
      ),
    );

    // Create an event as admin
    const twoHoursFromNow = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString();
    const event = await asUser(client, admin.id, () =>
      client.query(
        `select public.create_event($1::uuid, $2::public.modality, $3::text, $4::text, $5::timestamptz, $6::text)`,
        [group.id, 'F5', 'Test Event Name', 'http://test.map.url', twoHoursFromNow, null] // Corrected arguments for create_event
      ),
    );
    eventId = event.rows[0].create_event;
  });

  afterAll(async () => {
    await client.end();
  });

  it('non-group member cannot see the event', async () => {
    const result = await asUser(client, nonMember.id, () =>
      client.query(`select id from public.events where id = $1`, [eventId]),
    );
    expect(result.rowCount).toBe(0);
  });

  it('group member can see the event', async () => {
    const result = await asUser(client, member.id, () =>
      client.query(`select id from public.events where id = $1`, [eventId]),
    );
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].id).toBe(eventId);
  });

  it('group member (non-admin) cannot update the event', async () => {
    const fourHoursFromNow = new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(); // For update tests
    const updatedModality = 'F7';
    const updatedFieldName = 'Updated Field Name';
    const updatedFieldMapsUrl = 'http://updated.map.url';
    const updatedNotes = 'Updated notes';
    
    await expect(
        asUser(client, member.id, () =>
            client.query(
                `select public.update_event($1::uuid, $2::public.modality, $3::text, $4::text, $5::timestamptz, $6::text)`, // Corrected to 6 arguments
                [
                    eventId,
                    updatedModality,
                    updatedFieldName,
                    updatedFieldMapsUrl,
                    fourHoursFromNow,
                    updatedNotes,
                ]
            )
        )
    ).rejects.toThrow(/Unauthorized: Only group owners or admins can update events./);
});


  it('group member (non-admin) cannot cancel the event', async () => {
    await expect(
      asUser(client, member.id, () =>
        client.query(`select public.cancel_event($1, $2)`, [eventId, 'unauthorized cancel']),
      ),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it('admin can update the event', async () => {
    const fourHoursFromNow = new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString();
    const adminUpdatedModality = 'F11';
    const adminUpdatedFieldName = 'Admin Updated Event Name';
    const adminUpdatedFieldMapsUrl = 'http://admin.updated.map.url';
    const adminUpdatedNotes = 'Admin updated notes';

    const result = await asUser(client, admin.id, () =>
      client.query(
        `select public.update_event($1::uuid, $2::public.modality, $3::text, $4::text, $5::timestamptz, $6::text)`,
        [
            eventId,
            adminUpdatedModality,
            adminUpdatedFieldName,
            adminUpdatedFieldMapsUrl,
            fourHoursFromNow,
            adminUpdatedNotes,
        ]
      ),
    );
    expect(result.rowCount).toBe(1);
    // Verify the update by fetching the event as admin
    const updatedEvent = await asUser(client, admin.id, () =>
      client.query(`select field_name, scheduled_at, modality, field_maps_url, notes from public.events where id = $1`, [eventId]),
    );
    expect(updatedEvent.rows[0].field_name).toBe(adminUpdatedFieldName);
    expect(new Date(updatedEvent.rows[0].scheduled_at).toISOString()).toMatch(new RegExp(`^${fourHoursFromNow.substring(0, 19)}`));
    expect(updatedEvent.rows[0].modality).toBe(adminUpdatedModality);
    expect(updatedEvent.rows[0].field_maps_url).toBe(adminUpdatedFieldMapsUrl);
    expect(updatedEvent.rows[0].notes).toBe(adminUpdatedNotes);
  });

  it('admin can cancel the event', async () => {
    // Re-create event for cancellation test
    const fiveHoursFromNow = new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString();
    const newEvent = await asUser(client, admin.id, () =>
      client.query(
        `select public.create_event($1::uuid, $2::public.modality, $3::text, $4::text, $5::timestamptz, $6::text)`,
        [group.id, 'F5', 'Event to Cancel', 'http://cancel.map.url', fiveHoursFromNow, null] // Corrected arguments for create_event
      ),
    );
    const eventToCancelId = newEvent.rows[0].create_event;

    const cancelMotive = 'Weather conditions';
    const result = await asUser(client, admin.id, () =>
      client.query(`select public.cancel_event($1, $2)`, [eventToCancelId, cancelMotive]),
    );
    expect(result.rowCount).toBe(1);

    // Verify cancellation status and motive
    const cancelledEvent = await asUser(client, admin.id, () =>
      client.query(`select status, cancellation_motive from public.events where id = $1`, [eventToCancelId]),
    );
    expect(cancelledEvent.rows[0].status).toBe('cancelled');
    expect(cancelledEvent.rows[0].cancellation_motive).toBe(cancelMotive);
  });
});
