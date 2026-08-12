# Teams Local Performance Specification

## Purpose

Defines per-team performance accounting: valid played matches, approved goals, assists, tackles and official MVPs, plus the admin-approved team merit grant.

## Requirements

### Requirement: Per-team performance counters

The system MUST track, per team, the player's valid played matches and approved goals, assists, tackles and official MVPs.

#### Scenario: Approved data increments

- GIVEN an approved goal and an official MVP in a match
- WHEN local performance is computed
- THEN the team's goal and MVP counters MUST increment

### Requirement: Valid data only

Rejected, cancelled or non-participated data MUST NOT count toward any local counter.

#### Scenario: Rejected record excluded

- GIVEN a goal record rejected by the team admin
- WHEN local performance is computed
- THEN the goal MUST NOT increment the counter

#### Scenario: Cancelled match excluded

- GIVEN a cancelled match
- WHEN local performance is computed
- THEN the match MUST NOT count as a valid played match

#### Scenario: Non-participation excluded

- GIVEN a player who did not participate in a match
- WHEN local performance is computed
- THEN the match MUST NOT count for that player

### Requirement: Valid played match

A match MUST count as valid for a player only when the player played it and holds at least one approved stat in it.

#### Scenario: Valid match

- GIVEN a played match with at least one approved stat
- THEN it MUST count as a valid played match

#### Scenario: No approved stat

- GIVEN a played match without any approved stat
- THEN it MUST NOT count as valid

### Requirement: Team merit grant

After the player reaches 10 valid played matches in a team, the team admin MAY grant up to 3 total points across no more than 2 aptitude stats. v1 MUST support upgrades only; downgrades MUST NOT be granted. No merit grant MAY raise any aptitude above 99.

#### Scenario: Grant after threshold

- GIVEN a player with 10 valid played matches
- WHEN the admin grants 2 points to one aptitude
- THEN the grant MUST be applied

#### Scenario: Below threshold denied

- GIVEN a player with 9 valid played matches
- WHEN the admin attempts a grant
- THEN the grant MUST be denied

#### Scenario: Grant limits enforced

- GIVEN an attempt to grant 4 points or to touch 3 aptitudes
- THEN the grant MUST be denied

#### Scenario: Downgrade denied

- GIVEN an attempt to reduce an aptitude value
- THEN the action MUST be denied

#### Scenario: Cap at 99

- GIVEN an aptitude at 98
- WHEN the admin grants 2 points to it
- THEN the aptitude MUST NOT exceed 99
