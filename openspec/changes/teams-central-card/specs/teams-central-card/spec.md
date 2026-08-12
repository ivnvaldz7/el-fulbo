# Teams Central Card Specification

## Purpose

Defines the single global player card in the Teams domain: player-built initial stats, position selection and lock, visual tiers, and the central aggregation panel. The Teams card is fully decoupled from Groups.

## Requirements

### Requirement: One global card, Groups isolated

The system MUST maintain exactly one global Teams card per player. Teams card operations MUST NOT read, write, or reuse Groups `players` data or Groups logic.

#### Scenario: Single card per player

- GIVEN a player active in Teams
- WHEN the card is created
- THEN exactly one global card MUST exist
- AND no Groups table or logic MUST be accessed

#### Scenario: Groups data untouched

- GIVEN an existing Groups `players` row
- WHEN any Teams card operation runs
- THEN the Groups row MUST remain unmodified

### Requirement: Player-built initial stats

The player MUST build the card with every stat between 55 and 75 inclusive and MUST choose one primary and one secondary position. The build MUST NOT be limited by a point budget.

#### Scenario: Valid build

- GIVEN a player building their card
- WHEN all stats are within 55-75 and positions are chosen
- THEN the card MUST be saved with those values

#### Scenario: Out-of-range stat

- GIVEN a stat below 55 or above 75
- WHEN the player submits the build
- THEN the submission MUST be rejected

### Requirement: Position lock after approval

Once the player's card has been approved by any team admin, primary and secondary positions MUST be locked and MUST NOT be editable.

#### Scenario: Locked after approval

- GIVEN a card approved in at least one team
- WHEN the player attempts to change either position
- THEN the change MUST be rejected

#### Scenario: Editable before approval

- GIVEN a card not yet approved in any team
- WHEN the player changes positions
- THEN the change MUST be accepted

### Requirement: Visual tiers

The card MUST map to tiers using Groups visual thresholds only: bronze below 70, silver 70-79, gold 80-89, premium gold 90 or above.

#### Scenario: Tier boundaries

- GIVEN ratings 69, 75, 85 and 95
- WHEN tiers are computed
- THEN tiers MUST be bronze, silver, gold and premium gold respectively

### Requirement: Central aggregation

The central panel MUST aggregate approved quantities across all Teams teams: MVP, goals, assists, tackles, trophies and missions. Unapproved quantities MUST be excluded.

#### Scenario: Multi-team aggregation

- GIVEN approved records in two teams and a rejected record in a third
- WHEN the central panel is computed
- THEN the approved records MUST be aggregated
- AND the rejected record MUST be excluded
