# Proposal: Teams Central Card

## Intent

Teams has no dedicated card domain: `process_team_player_progression` writes to Groups-scoped `players`. This change defines the replacement architecture: a global player card, per-team frozen snapshots, team-local performance, and automatic central missions/upgrades — approved records only, cap 99, no downgrades.

## Scope

### In Scope
- Architecture definition only; implementation later
- Global card: initial stats 55–75, player-built; positions locked after approval
- Admission: per-team frozen snapshot; admin approves/rejects admission, local stats, merits for that team; edit + resubmit allowed
- Team-local performance (goals, assists, tackles, MVPs, valid matches) separate from aptitudes
- Central panel aggregates approved MVPs, goals, assists, tackles, trophies, missions
- Automatic missions/upgrades, idempotent per cycle, no admin approval: MVP×5 → +2 via aptitude map; trophies MVP 3/5/10/20, goals/assists 10/25/50/100, tackles 20/50/100/200; upgrades 25/50 goals, 25/50 assists, 50/100 tackles; cap 99
- Team merit: 10 valid matches (played, ≥1 approved stat; not cancelled/rejected/no-participation) → ≤3 points, ≤2 aptitudes
- Tier thresholds from Grupos visuals only: bronze <70, silver 70–79, gold 80–89, premium ≥90

### Out of Scope
- Match lifecycle, UI, migrations, feat-018 MVP voting (later implementation tasks)
- Grupos cards, stats, progression, logic never reused

## Capabilities

### New Capabilities
- `teams-central-card`: global card, initial stats, position lock, central aggregation, tiers
- `teams-card-admission`: frozen per-team snapshot, approval/rejection, resubmission
- `teams-local-performance`: per-team counters, valid-match rule, merit grant
- `teams-central-missions`: MVP mission, trophies, upgrades, idempotent cycles, cap 99

### Modified Capabilities
- None (replaces `process_team_player_progression`; no live spec)

## Approach

New Teams-scoped tables (global card, snapshots, local performance, mission ledger keyed by cycle) and processing RPCs fed by approved records, auto-distributing via aptitude map, cap 99. Retire Groups-scoped progression; no migration from Grupos.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | Card tables, ledgers, RPCs |
| `src/lib/services/` | New | Card/admission/missions services |
| `src/lib/types/teams.types.ts` | Modified | Card domain types |
| Groups `players` + progression | Removed | Decouple; data untouched |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Double counting local vs central | Med | Single ledger, approved-only |
| Race in automatic missions | Med | Idempotent cycle keys + unique constraints |
| Rejection affecting other teams | Low | Per-team snapshot isolation |
| Coupling to Grupos tables | Med | Dedicated tables, no Grupos logic |

## Rollback Plan

Drop new tables/RPCs; restore `process_team_player_progression`. Additive — Groups data never modified, no backfill.

## Dependencies

- feat-018 MVP records (official MVP source, later)
- Teams match lifecycle producing approved records (later)

## Success Criteria

- [ ] Card data in dedicated tables; Groups `players` untouched
- [ ] Stats 55–75 initial; positions locked after approval
- [ ] Snapshots frozen; global upgrades never retroactively update teams
- [ ] Approval/rejection per team; edit + resubmit allowed
- [ ] Missions/upgrades idempotent, approved-only, cap 99; merit ≤3 points, ≤2 aptitudes, no downgrades
- [ ] Central panel aggregates approved records only
