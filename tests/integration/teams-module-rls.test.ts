import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { asUser, createDbClient, seedGroup, seedUser } from './db';

type PlayerPosition = 'DEL' | 'MED' | 'DEF' | 'ARQ';

async function seedTeamAsUser(client: Client, userId: string, name: string) {
  const created = await asUser(client, userId, async () => {
    const team = await client.query<{ id: string }>(
      `
        insert into public.teams (name, slug, created_by_user_id)
        values ($1, $2, $3)
        returning id
      `,
      [name, `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${userId.slice(0, 8)}`, userId],
    );

    await client.query(
      `
        insert into public.team_members (team_id, user_id, role, primary_position)
        values ($1, $2, 'admin', 'MED')
      `,
      [team.rows[0]!.id, userId],
    );

    return team.rows[0]!.id;
  });

  return created;
}

async function addTeamMember(
  client: Client,
  adminUserId: string,
  teamId: string,
  memberUserId: string,
  position: PlayerPosition = 'MED',
) {
  await asUser(client, adminUserId, () =>
    client.query(
      `
        insert into public.team_members (team_id, user_id, role, primary_position)
        values ($1, $2, 'member', $3)
      `,
      [teamId, memberUserId, position],
    ),
  );
}
async function seedPlayerProfile(
  client: Client,
  userId: string,
  position: PlayerPosition,
  label: string,
) {
  const admin = await seedUser(client, `player-profile-admin-${label}`);
  const group = await seedGroup(client, admin.id);

  await client.query(
    `
      insert into public.players (
        user_id,
        group_id,
        display_name,
        primary_position,
        stats,
        stats_status,
        joined_at
      )
      values ($1, $2, $3, $4, '{}'::jsonb, 'approved', now())
    `,
    [userId, group.id, `Perfil ${label}`, position],
  );
}

describe('teams module persistence and RLS', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    await client.end();
  });

  it('keeps team membership independent from group membership', async () => {
    const admin = await seedUser(client, 'team-admin-independent');
    const member = await seedUser(client, 'team-member-independent');
    const group = await seedGroup(client, admin.id);
    const teamId = await seedTeamAsUser(client, admin.id, 'Independiente FC');

    await addTeamMember(client, admin.id, teamId, member.id, 'DEL');

    const groupMemberships = await client.query(
      `
        select count(*)::int as count
        from public.group_memberships
        where group_id = $1 and user_id = $2
      `,
      [group.id, member.id],
    );
    const teamMemberships = await client.query(
      `
        select count(*)::int as count
        from public.team_members
        where team_id = $1 and user_id = $2
      `,
      [teamId, member.id],
    );

    expect(groupMemberships.rows[0].count).toBe(0);
    expect(teamMemberships.rows[0].count).toBe(1);
  });

  it('allows members to read their team context and blocks non-members from private team data', async () => {
    const admin = await seedUser(client, 'team-admin-read');
    const member = await seedUser(client, 'team-member-read');
    const outsider = await seedUser(client, 'team-outsider-read');
    const teamId = await seedTeamAsUser(client, admin.id, 'Lectores FC');

    await addTeamMember(client, admin.id, teamId, member.id, 'MED');

    const memberView = await asUser(client, member.id, () =>
      client.query(
        `
          select t.id, tm.role
          from public.teams t
          join public.team_members tm on tm.team_id = t.id
          where t.id = $1 and tm.user_id = $2
        `,
        [teamId, member.id],
      ),
    );
    const outsiderTeams = await asUser(client, outsider.id, () =>
      client.query(`select id from public.teams where id = $1`, [teamId]),
    );
    const outsiderMembers = await asUser(client, outsider.id, () =>
      client.query(`select id from public.team_members where team_id = $1`, [teamId]),
    );

    expect(memberView.rowCount).toBe(1);
    expect(memberView.rows[0]).toMatchObject({ id: teamId, role: 'member' });
    expect(outsiderTeams.rowCount).toBe(0);
    expect(outsiderMembers.rowCount).toBe(0);
  });

  it('allows team admins, not regular members, to manage roster and matches', async () => {
    const admin = await seedUser(client, 'team-admin-manage');
    const member = await seedUser(client, 'team-member-manage');
    const candidate = await seedUser(client, 'team-candidate-manage');
    const teamId = await seedTeamAsUser(client, admin.id, 'Admins FC');

    await addTeamMember(client, admin.id, teamId, member.id, 'DEF');

    await expect(
      asUser(client, member.id, () =>
        client.query(
          `
            insert into public.team_members (team_id, user_id, role, primary_position)
            values ($1, $2, 'member', 'MED')
          `,
          [teamId, candidate.id],
        ),
      ),
    ).rejects.toThrow();

    const match = await asUser(client, admin.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_matches (team_id, scheduled_at, opponent_name, status, created_by_user_id)
          values ($1, now() + interval '2 days', 'Rivales FC', 'scheduled', $2)
          returning id
        `,
        [teamId, admin.id],
      ),
    );

    await expect(
      asUser(client, member.id, () =>
        client.query(
          `
            insert into public.team_matches (team_id, scheduled_at, opponent_name, status, created_by_user_id)
            values ($1, now() + interval '3 days', 'Otro Rival', 'scheduled', $2)
          `,
          [teamId, member.id],
        ),
      ),
    ).rejects.toThrow();

    expect(match.rows[0]!.id).toEqual(expect.any(String));
  });

  it('allows only team members to sign up for team matches', async () => {
    const admin = await seedUser(client, 'team-admin-signup');
    const member = await seedUser(client, 'team-member-signup');
    const outsider = await seedUser(client, 'team-outsider-signup');
    const teamId = await seedTeamAsUser(client, admin.id, 'Anotados FC');

    await addTeamMember(client, admin.id, teamId, member.id, 'DEL');

    const match = await asUser(client, admin.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_matches (team_id, scheduled_at, opponent_name, status, created_by_user_id)
          values ($1, now() + interval '2 days', 'Visitante FC', 'scheduled', $2)
          returning id
        `,
        [teamId, admin.id],
      ),
    );

    const signup = await asUser(client, member.id, () =>
      client.query(
        `
          insert into public.team_match_signups (team_match_id, team_id, user_id, status)
          values ($1, $2, $3, 'going')
          returning id, status
        `,
        [match.rows[0]!.id, teamId, member.id],
      ),
    );

    await expect(
      asUser(client, outsider.id, () =>
        client.query(
          `
            insert into public.team_match_signups (team_match_id, team_id, user_id, status)
            values ($1, $2, $3, 'going')
          `,
          [match.rows[0]!.id, teamId, outsider.id],
        ),
      ),
    ).rejects.toThrow();

    expect(signup.rows[0]).toMatchObject({ status: 'going' });
  });

  it('stores stat submissions as pending and aggregates only approved stats from played matches', async () => {
    const admin = await seedUser(client, 'team-admin-stats');
    const forward = await seedUser(client, 'team-forward-stats');
    const defender = await seedUser(client, 'team-defender-stats');
    const teamId = await seedTeamAsUser(client, admin.id, 'Stats FC');

    await addTeamMember(client, admin.id, teamId, forward.id, 'DEL');
    await addTeamMember(client, admin.id, teamId, defender.id, 'DEF');

    const match = await asUser(client, admin.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_matches (
            team_id,
            scheduled_at,
            opponent_name,
            status,
            team_score,
            opponent_score,
            played_at,
            created_by_user_id
          )
          values ($1, now() - interval '1 day', 'Cerrado FC', 'played', 4, 2, now(), $2)
          returning id
        `,
        [teamId, admin.id],
      ),
    );

    const goalSubmission = await asUser(client, forward.id, () =>
      client.query(
        `
          insert into public.team_stat_submissions (team_id, team_match_id, user_id, stat_kind, value)
          values ($1, $2, $3, 'goals', 2)
          returning status
        `,
        [teamId, match.rows[0]!.id, forward.id],
      ),
    );

    const rejectedSubmission = await asUser(client, defender.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_stat_submissions (team_id, team_match_id, user_id, stat_kind, value)
          values ($1, $2, $3, 'tackles', 5)
          returning id
        `,
        [teamId, match.rows[0]!.id, defender.id],
      ),
    );

    const approvedSubmission = await client.query<{ id: string }>(
      `
        select id
        from public.team_stat_submissions
        where team_id = $1 and user_id = $2
      `,
      [teamId, forward.id],
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
        approvedSubmission.rows[0]!.id,
      ]),
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'rejected'::public.team_stat_submission_status, 'inflated')`, [
        rejectedSubmission.rows[0]!.id,
      ]),
    );

    const totals = await asUser(client, forward.id, () =>
      client.query(
        `
          select matches_played, goals, assists, tackles
          from public.team_approved_stat_totals
          where team_id = $1
        `,
        [teamId],
      ),
    );

    expect(goalSubmission.rows[0].status).toBe('pending');
    expect(totals.rows[0]).toMatchObject({
      matches_played: 1,
      goals: '2',
      assists: '0',
      tackles: '0',
    });
  });

  it('rejects stat kinds that do not match the player team position', async () => {
    const admin = await seedUser(client, 'team-admin-position');
    const defender = await seedUser(client, 'team-defender-position');
    const teamId = await seedTeamAsUser(client, admin.id, 'Posiciones FC');

    await addTeamMember(client, admin.id, teamId, defender.id, 'DEF');

    const match = await asUser(client, admin.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_matches (team_id, scheduled_at, opponent_name, status, team_score, opponent_score, played_at, created_by_user_id)
          values ($1, now() - interval '1 day', 'Rival Posicional', 'played', 1, 0, now(), $2)
          returning id
        `,
        [teamId, admin.id],
      ),
    );

    await expect(
      asUser(client, defender.id, () =>
        client.query(
          `
            insert into public.team_stat_submissions (team_id, team_match_id, user_id, stat_kind, value)
            values ($1, $2, $3, 'goals', 1)
          `,
          [teamId, match.rows[0]!.id, defender.id],
        ),
      ),
    ).rejects.toThrow(/TEAM_STAT_KIND_NOT_ALLOWED/);
  });

  it('lets admins create team invitations and players join through the team invite foundation', async () => {
    const admin = await seedUser(client, 'team-admin-invite');
    const invitee = await seedUser(client, 'team-invitee');
    const teamId = await seedTeamAsUser(client, admin.id, 'Invitaciones FC');

    await seedPlayerProfile(client, invitee.id, 'MED', 'invitee');

    const invite = await asUser(client, admin.id, () =>
      client.query<{ code: string }>(
        `
          insert into public.team_invitations (team_id, code, created_by_user_id)
          values ($1, $3, $2)
          returning code
        `,
        [teamId, admin.id, `TEAM-${randomUUID().slice(0, 8).toUpperCase()}`],
      ),
    );

    const accepted = await asUser(client, invitee.id, () =>
      client.query(`select * from public.accept_team_invite($1)`, [invite.rows[0]!.code]),
    );

    expect(accepted.rows[0]).toMatchObject({
      team_id: teamId,
      already_member: false,
      role: 'member',
    });
  });

  it('consumes team invitations once before creating memberships', async () => {
    const admin = await seedUser(client, 'team-admin-invite-single-use');
    const firstInvitee = await seedUser(client, 'team-invitee-single-use-first');
    const secondInvitee = await seedUser(client, 'team-invitee-single-use-second');
    const teamId = await seedTeamAsUser(client, admin.id, 'Single Use FC');

    await seedPlayerProfile(client, firstInvitee.id, 'MED', 'su1');
    await seedPlayerProfile(client, secondInvitee.id, 'DEL', 'su2');

    const invite = await asUser(client, admin.id, () =>
      client.query<{ code: string }>(
        `
          insert into public.team_invitations (team_id, code, created_by_user_id)
          values ($1, $3, $2)
          returning code
        `,
        [teamId, admin.id, `TEAM-${randomUUID().slice(0, 8).toUpperCase()}`],
      ),
    );

    const accepted = await asUser(client, firstInvitee.id, () =>
      client.query(`select * from public.accept_team_invite($1)`, [invite.rows[0]!.code]),
    );

    await expect(
      asUser(client, secondInvitee.id, () =>
        client.query(`select * from public.accept_team_invite($1)`, [invite.rows[0]!.code]),
      ),
    ).rejects.toThrow(/TEAM_INVITE_CODE_INVALID/);

    const [memberships, invitation] = await Promise.all([
      client.query(
        `
          select user_id
          from public.team_members
          where team_id = $1 and user_id = any($2::uuid[])
          order by user_id
        `,
        [teamId, [firstInvitee.id, secondInvitee.id]],
      ),
      client.query(
        `
          select accepted_by_user_id, accepted_at
          from public.team_invitations
          where code = $1
        `,
        [invite.rows[0]!.code],
      ),
    ]);

    expect(accepted.rows[0]).toMatchObject({
      team_id: teamId,
      already_member: false,
      role: 'member',
    });
    expect(memberships.rows).toEqual([{ user_id: firstInvitee.id }]);
    expect(invitation.rows[0]).toMatchObject({ accepted_by_user_id: firstInvitee.id });
    expect(invitation.rows[0]!.accepted_at).toBeTruthy();
  });

  it('uses atomic invitation consumption SQL before membership side effects', () => {
    const migration = readFileSync('supabase/migrations/20260712000000_teams_module_foundation.sql', 'utf8');
    const acceptInviteFunction = migration.slice(
      migration.indexOf('create or replace function public.accept_team_invite'),
      migration.indexOf('create view public.team_approved_stat_totals'),
    );

    expect(acceptInviteFunction).toMatch(
      /update public\.team_invitations ti[\s\S]*accepted_at is null[\s\S]*returning \* into v_invitation;/,
    );
    expect(acceptInviteFunction.indexOf('returning * into v_invitation')).toBeLessThan(
      acceptInviteFunction.indexOf('insert into public.team_members'),
    );
    expect(acceptInviteFunction).not.toMatch(/select \* into v_invitation[\s\S]*from public\.team_invitations/);
  });

  it('keeps stat review atomic by updating pending submissions only', () => {
    const migration = readFileSync('supabase/migrations/20260712010000_teams_module_services_progression.sql', 'utf8');
    const reviewFunction = migration.slice(
      migration.indexOf('create or replace function public.review_team_stat_submission'),
      migration.indexOf('create or replace function public.process_team_player_progression'),
    );

    expect(reviewFunction).toMatch(
      /update public\.team_stat_submissions[\s\S]*where id = p_submission_id[\s\S]*status = 'pending'[\s\S]*returning \* into v_submission;/,
    );
    expect(reviewFunction).toMatch(/if v_submission\.id is null then[\s\S]*TEAM_STAT_SUBMISSION_FINAL/);
  });

  it('does not expose internal team helper functions as public callable RPCs', async () => {
    const admin = await seedUser(client, 'team-admin-helper-deny');
    const member = await seedUser(client, 'team-member-helper-deny');
    const teamId = await seedTeamAsUser(client, admin.id, 'Helpers FC');

    await addTeamMember(client, admin.id, teamId, member.id, 'MED');

    const match = await asUser(client, admin.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_matches (team_id, scheduled_at, opponent_name, status, created_by_user_id)
          values ($1, now() + interval '2 days', 'Helper Rival', 'scheduled', $2)
          returning id
        `,
        [teamId, admin.id],
      ),
    );

    const publicHelpers = await client.query<{ proname: string }>(
      `
        select p.proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = any($1::text[])
        order by p.proname
      `,
      [
        [
          'is_team_member',
          'is_team_admin',
          'can_bootstrap_team_admin',
          'team_member_stat_kind_allowed',
          'is_team_match_played',
          'is_team_match_future',
          'is_active_team_member',
        ],
      ],
    );

    expect(publicHelpers.rows).toEqual([]);
    await expect(
      asUser(client, member.id, () => client.query(`select app_private.is_team_member($1)`, [teamId])),
    ).rejects.toThrow(/permission denied for schema app_private/i);
    await expect(
      asUser(client, member.id, () => client.query(`select public.is_team_member($1)`, [teamId])),
    ).rejects.toThrow(/function public\.is_team_member/i);
    await expect(
      asUser(client, member.id, () => client.query(`select public.is_team_admin($1)`, [teamId])),
    ).rejects.toThrow(/function public\.is_team_admin/i);
    await expect(
      asUser(client, admin.id, () => client.query(`select public.can_bootstrap_team_admin($1, $2)`, [teamId, admin.id])),
    ).rejects.toThrow(/function public\.can_bootstrap_team_admin/i);
    await expect(
      asUser(client, member.id, () =>
        client.query(`select public.team_member_stat_kind_allowed($1, $2, 'assists')`, [teamId, member.id]),
      ),
    ).rejects.toThrow(/function public\.team_member_stat_kind_allowed/i);
    await expect(
      asUser(client, member.id, () => client.query(`select public.is_team_match_played($1, $2)`, [match.rows[0]!.id, teamId])),
    ).rejects.toThrow(/function public\.is_team_match_played/i);
    await expect(
      asUser(client, member.id, () => client.query(`select public.is_team_match_future($1, $2)`, [match.rows[0]!.id, teamId])),
    ).rejects.toThrow(/function public\.is_team_match_future/i);
    await expect(
      asUser(client, member.id, () => client.query(`select public.is_active_team_member($1, $2)`, [teamId, member.id])),
    ).rejects.toThrow(/function public\.is_active_team_member/i);
  });

  it('does not allow PREPARE/EXECUTE to bypass internal team helper privacy', async () => {
    const admin = await seedUser(client, 'team-admin-helper-prepare');
    const member = await seedUser(client, 'team-member-helper-prepare');
    const teamId = await seedTeamAsUser(client, admin.id, 'Prepared Helpers FC');
    const statementName = `prepared_helper_${randomUUID().replace(/-/g, '_')}`;

    await addTeamMember(client, admin.id, teamId, member.id, 'MED');

    await expect(
      asUser(client, member.id, async () => {
        await client.query(`prepare ${statementName}(uuid) as select public.is_team_member($1)`);
        return client.query(`execute ${statementName}('${teamId}'::uuid)`);
      }),
    ).rejects.toThrow(/function public\.is_team_member/i);
  });

  it('prevents admins from moving a match signup to a non-member user', async () => {
    const admin = await seedUser(client, 'team-admin-signup-outsider');
    const member = await seedUser(client, 'team-member-signup-outsider');
    const outsider = await seedUser(client, 'team-outsider-signup-update');
    const teamId = await seedTeamAsUser(client, admin.id, 'Signup Safety FC');

    await addTeamMember(client, admin.id, teamId, member.id, 'DEL');

    const match = await asUser(client, admin.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_matches (team_id, scheduled_at, opponent_name, status, created_by_user_id)
          values ($1, now() + interval '2 days', 'Visitante Seguro', 'scheduled', $2)
          returning id
        `,
        [teamId, admin.id],
      ),
    );

    const signup = await asUser(client, member.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_match_signups (team_match_id, team_id, user_id, status)
          values ($1, $2, $3, 'going')
          returning id
        `,
        [match.rows[0]!.id, teamId, member.id],
      ),
    );

    await expect(
      asUser(client, admin.id, () =>
        client.query(
          `
            update public.team_match_signups
            set user_id = $1
            where id = $2
          `,
          [outsider.id, signup.rows[0]!.id],
        ),
      ),
    ).rejects.toThrow(/TEAM_SIGNUP_USER_NOT_MEMBER/);
  });

  it('rejects team invite acceptance when the user has no player profile position source', async () => {
    const admin = await seedUser(client, 'team-admin-invite-no-profile');
    const invitee = await seedUser(client, 'team-invitee-no-profile');
    const teamId = await seedTeamAsUser(client, admin.id, 'No Fallback FC');

    const invite = await asUser(client, admin.id, () =>
      client.query<{ code: string }>(
        `
          insert into public.team_invitations (team_id, code, created_by_user_id)
          values ($1, $3, $2)
          returning code
        `,
        [teamId, admin.id, `TEAM-${randomUUID().slice(0, 8).toUpperCase()}`],
      ),
    );

    await expect(
      asUser(client, invitee.id, () => client.query(`select * from public.accept_team_invite($1)`, [invite.rows[0]!.code])),
    ).rejects.toThrow(/TEAM_PLAYER_PROFILE_REQUIRED/);

    const [membership, invitation] = await Promise.all([
      client.query(`select id from public.team_members where team_id = $1 and user_id = $2`, [teamId, invitee.id]),
      client.query(`select accepted_by_user_id, accepted_at from public.team_invitations where code = $1`, [invite.rows[0]!.code]),
    ]);

    expect(membership.rowCount).toBe(0);
    expect(invitation.rows[0]).toMatchObject({ accepted_by_user_id: null, accepted_at: null });
  });

  it('uses the accepting player profile position when joining through a team invitation', async () => {
    const admin = await seedUser(client, 'team-admin-invite-position');
    const defender = await seedUser(client, 'team-invitee-defender');
    const forward = await seedUser(client, 'team-invitee-forward');
    const teamId = await seedTeamAsUser(client, admin.id, 'Invited Positions FC');

    await seedPlayerProfile(client, defender.id, 'DEF', 'defender');
    await seedPlayerProfile(client, forward.id, 'DEL', 'forward');

    const defenderInvite = await asUser(client, admin.id, () =>
      client.query<{ code: string }>(
        `
          insert into public.team_invitations (team_id, code, created_by_user_id)
          values ($1, $3, $2)
          returning code
        `,
        [teamId, admin.id, `TEAM-${randomUUID().slice(0, 8).toUpperCase()}`],
      ),
    );
    const forwardInvite = await asUser(client, admin.id, () =>
      client.query<{ code: string }>(
        `
          insert into public.team_invitations (team_id, code, created_by_user_id)
          values ($1, $3, $2)
          returning code
        `,
        [teamId, admin.id, `TEAM-${randomUUID().slice(0, 8).toUpperCase()}`],
      ),
    );

    await asUser(client, defender.id, () =>
      client.query(`select * from public.accept_team_invite($1)`, [defenderInvite.rows[0]!.code]),
    );
    await asUser(client, forward.id, () =>
      client.query(`select * from public.accept_team_invite($1)`, [forwardInvite.rows[0]!.code]),
    );

    const memberships = await client.query(
      `
        select user_id, primary_position
        from public.team_members
        where team_id = $1 and user_id = any($2::uuid[])
        order by primary_position
      `,
      [teamId, [defender.id, forward.id]],
    );

    expect(memberships.rows).toEqual([
      { user_id: defender.id, primary_position: 'DEF' },
      { user_id: forward.id, primary_position: 'DEL' },
    ]);
  });

  it('hides all private team operational data from outsiders', async () => {
    const admin = await seedUser(client, 'team-admin-outsider-private');
    const forward = await seedUser(client, 'team-forward-outsider-private');
    const outsider = await seedUser(client, 'team-outsider-private');
    const teamId = await seedTeamAsUser(client, admin.id, 'Privados FC');

    await addTeamMember(client, admin.id, teamId, forward.id, 'DEL');

    const match = await asUser(client, admin.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_matches (
            team_id,
            scheduled_at,
            opponent_name,
            status,
            team_score,
            opponent_score,
            played_at,
            created_by_user_id
          )
          values ($1, now() - interval '1 day', 'Oculto FC', 'played', 2, 1, now(), $2)
          returning id
        `,
        [teamId, admin.id],
      ),
    );

    await asUser(client, admin.id, () =>
      client.query(
        `
          insert into public.team_invitations (team_id, code, created_by_user_id)
          values ($1, $3, $2)
        `,
        [teamId, admin.id, `TEAM-${randomUUID().slice(0, 8).toUpperCase()}`],
      ),
    );
    await client.query(
      `
        insert into public.team_match_signups (team_match_id, team_id, user_id, status)
        values ($1, $2, $3, 'going')
      `,
      [match.rows[0]!.id, teamId, forward.id],
    );
    await asUser(client, forward.id, () =>
      client.query(
        `
          insert into public.team_stat_submissions (team_id, team_match_id, user_id, stat_kind, value)
          values ($1, $2, $3, 'goals', 1)
        `,
        [teamId, match.rows[0]!.id, forward.id],
      ),
    );
    const submission = await client.query<{ id: string }>(
      `
        select id
        from public.team_stat_submissions
        where team_id = $1 and user_id = $2
      `,
      [teamId, forward.id],
    );
    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
        submission.rows[0]!.id,
      ]),
    );

    const [matches, signups, submissions, invitations, totals] = await asUser(client, outsider.id, async () => {
      const outsiderMatches = await client.query(`select id from public.team_matches where team_id = $1`, [teamId]);
      const outsiderSignups = await client.query(`select id from public.team_match_signups where team_id = $1`, [teamId]);
      const outsiderSubmissions = await client.query(`select id from public.team_stat_submissions where team_id = $1`, [teamId]);
      const outsiderInvitations = await client.query(`select id from public.team_invitations where team_id = $1`, [teamId]);
      const outsiderTotals = await client.query(`select team_id from public.team_approved_stat_totals where team_id = $1`, [teamId]);

      return [outsiderMatches, outsiderSignups, outsiderSubmissions, outsiderInvitations, outsiderTotals];
    });

    expect(matches.rowCount).toBe(0);
    expect(signups.rowCount).toBe(0);
    expect(submissions.rowCount).toBe(0);
    expect(invitations.rowCount).toBe(0);
    expect(totals.rowCount).toBe(0);
  });

  it('forces stat review through the RPC and seals reviewer fields to the acting admin', async () => {
    const admin = await seedUser(client, 'team-admin-review-seal');
    const otherAdmin = await seedUser(client, 'team-other-admin-review-seal');
    const forward = await seedUser(client, 'team-forward-review-seal');
    const defender = await seedUser(client, 'team-defender-review-seal');
    const outsider = await seedUser(client, 'team-outsider-review-seal');
    const teamId = await seedTeamAsUser(client, admin.id, 'Review Seal FC');

    await addTeamMember(client, admin.id, teamId, otherAdmin.id, 'MED');
    await asUser(client, admin.id, () =>
      client.query(`update public.team_members set role = 'admin' where team_id = $1 and user_id = $2`, [teamId, otherAdmin.id]),
    );
    await addTeamMember(client, admin.id, teamId, forward.id, 'DEL');
    await addTeamMember(client, admin.id, teamId, defender.id, 'DEF');

    const match = await asUser(client, admin.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_matches (
            team_id,
            scheduled_at,
            opponent_name,
            status,
            team_score,
            opponent_score,
            played_at,
            created_by_user_id
          )
          values ($1, now() - interval '1 day', 'Auditoria FC', 'played', 3, 1, now(), $2)
          returning id
        `,
        [teamId, admin.id],
      ),
    );

    const approved = await asUser(client, forward.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_stat_submissions (team_id, team_match_id, user_id, stat_kind, value)
          values ($1, $2, $3, 'goals', 2)
          returning id
        `,
        [teamId, match.rows[0]!.id, forward.id],
      ),
    );
    const rejected = await asUser(client, defender.id, () =>
      client.query<{ id: string }>(
        `
          insert into public.team_stat_submissions (team_id, team_match_id, user_id, stat_kind, value)
          values ($1, $2, $3, 'tackles', 4)
          returning id
        `,
        [teamId, match.rows[0]!.id, defender.id],
      ),
    );

    await expect(
      asUser(client, admin.id, () =>
        client.query(
          `
            update public.team_stat_submissions
            set status = 'approved', reviewed_by_user_id = $1, reviewed_at = now()
            where id = $2
          `,
          [outsider.id, approved.rows[0]!.id],
        ),
      ),
    ).rejects.toThrow(/permission denied|violates row-level security/i);

    await asUser(client, admin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'approved'::public.team_stat_submission_status)`, [
        approved.rows[0]!.id,
      ]),
    );
    await asUser(client, otherAdmin.id, () =>
      client.query(`select * from public.review_team_stat_submission($1, 'rejected'::public.team_stat_submission_status, 'incorrect')`, [
        rejected.rows[0]!.id,
      ]),
    );

    await expect(
      asUser(client, admin.id, () => client.query(`delete from public.team_stat_submissions where id = $1`, [approved.rows[0]!.id])),
    ).rejects.toThrow(/permission denied|violates row-level security/i);
    const stillApproved = await client.query(`select id from public.team_stat_submissions where id = $1`, [approved.rows[0]!.id]);

    expect(stillApproved.rowCount).toBe(1);

    await expect(
      asUser(client, admin.id, () => client.query(`delete from public.team_matches where id = $1`, [match.rows[0]!.id])),
    ).rejects.toThrow(/foreign key|violates/i);

    await expect(
      asUser(client, admin.id, () => client.query(`delete from public.teams where id = $1`, [teamId])),
    ).rejects.toThrow(/foreign key|violates/i);

    await expect(client.query(`delete from public.users where id = $1`, [forward.id])).rejects.toThrow(/foreign key|violates/i);

    const reviewed = await client.query(
      `
        select id, status, reviewed_by_user_id
        from public.team_stat_submissions
        where id = any($1::uuid[])
        order by status
      `,
      [[approved.rows[0]!.id, rejected.rows[0]!.id]],
    );

    expect(reviewed.rows).toEqual([
      { id: approved.rows[0]!.id, status: 'approved', reviewed_by_user_id: admin.id },
      { id: rejected.rows[0]!.id, status: 'rejected', reviewed_by_user_id: otherAdmin.id },
    ]);
  });
});
