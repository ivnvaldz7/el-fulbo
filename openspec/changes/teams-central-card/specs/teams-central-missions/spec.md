# Teams Central Missions Specification

## Purpose

Defines automatic central missions aggregated across all Teams teams: trophy thresholds, the MVP point mission, stat upgrade milestones, idempotent cycles and the 99 cap. Rewards use approved quantities only and require no team admin approval.

## Requirements

### Requirement: Trophy thresholds

The system MUST award trophies automatically when approved quantities reach MVP 3/5/10/20, goals 10/25/50/100, assists 10/25/50/100 and tackles 20/50/100/200. Each threshold MUST be awarded once.

#### Scenario: Trophy at threshold

- GIVEN 10 approved goals
- WHEN central missions run
- THEN the 10-goal trophy MUST be awarded
- AND the threshold MUST NOT award again

#### Scenario: Below threshold

- GIVEN 9 approved goals
- WHEN central missions run
- THEN no goal trophy MUST be awarded

### Requirement: MVP point mission

The system MUST grant +2 global points for every 5 official MVPs on cycles 5, 10, 15 and so on. A cycle MUST be recorded when granted and MUST NOT be granted twice.

#### Scenario: Cycle grants points

- GIVEN 5 approved official MVPs
- WHEN central missions run
- THEN +2 global points MUST be granted
- AND the 5-cycle MUST be recorded

#### Scenario: Duplicate processing

- GIVEN the 5-cycle already recorded and the MVP count unchanged
- WHEN central missions run again
- THEN no additional points MUST be granted

#### Scenario: Partial cycle

- GIVEN 7 approved MVPs with only the 5-cycle recorded
- WHEN central missions run
- THEN the 10-cycle MUST NOT grant

### Requirement: Stat upgrade milestones

The system MUST grant +1 per milestone from approved quantities: 25 goals to SHO (offensive equivalent), 50 goals to PAC (second offensive), 25 assists to PAS, 50 assists to DRI, 50 tackles to DEF (goalkeeper equivalent), 100 tackles to PHY (second goalkeeper defensive). Rewards MUST resolve through the deterministic position aptitude map: DEL pac/sho/dri, MED pas/dri/phy, DEF def/phy/pas, ARQ div/ref/han; goals map to offensive aptitudes for eligible DEL players only, assists to MED aptitudes, and tackles to DEF/ARQ aptitudes. ARQ players MUST NOT receive goal milestones because goals are not a valid ARQ stat. Each milestone MUST grant once.

#### Scenario: Goal milestones for DEL

- GIVEN a DEL player with 25 approved goals
- WHEN central missions run
- THEN SHO MUST increase by 1
- AND at 50 approved goals PAC MUST increase by 1

#### Scenario: Assist and tackle milestones

- GIVEN 25 approved assists and 50 approved tackles
- WHEN central missions run
- THEN PAS MUST increase by 1 and DEF by 1
- AND goalkeeper equivalents MUST apply to ARQ

#### Scenario: Goal milestones exclude goalkeepers

- GIVEN an ARQ player with approved team performance
- WHEN central missions run
- THEN goal milestones MUST NOT be generated for that player

#### Scenario: Milestone grants once

- GIVEN the 25-goal milestone recorded
- WHEN the goal count reaches 49
- THEN no SHO increase MUST occur

### Requirement: Automatic and admin-independent

Central missions MUST run automatically, MUST be repeatable by cycle, and MUST NOT require team admin approval. Only approved quantities MAY trigger rewards.

#### Scenario: No admin action

- GIVEN approved quantities reaching a threshold
- WHEN missions run
- THEN the reward MUST be applied without any admin action

#### Scenario: Rejected data excluded

- GIVEN a rejected goal record
- WHEN central missions run
- THEN that record MUST NOT contribute to any milestone

### Requirement: Stat cap

No reward MAY raise any stat above 99. A reward MUST be applied up to the cap and its cycle MUST still be recorded.

#### Scenario: Cap applied

- GIVEN a stat at 98 and a +2 reward
- WHEN central missions run
- THEN the stat MUST become 99
- AND the cycle MUST be recorded as granted
