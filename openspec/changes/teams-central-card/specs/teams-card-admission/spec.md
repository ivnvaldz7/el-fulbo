# Teams Card Admission Specification

## Purpose

Defines per-team admission of the global card: frozen snapshots on membership, single-admin approval scoped to one team, and rejection with edit and resubmission.

## Requirements

### Requirement: Frozen snapshot on membership

The system MUST create a frozen snapshot of the player's global card for each team at membership time. Later global upgrades MUST NOT modify existing team snapshots.

#### Scenario: Snapshot at join

- GIVEN a player with a global card
- WHEN the player joins a team
- THEN a snapshot MUST capture the card's current values for that team

#### Scenario: Upgrades do not retroactively apply

- GIVEN an existing team snapshot
- WHEN the global card receives an upgrade
- THEN the existing snapshot MUST remain unchanged

#### Scenario: New teams see current card

- GIVEN an upgraded global card
- WHEN the player joins a second team
- THEN the new snapshot MUST capture the upgraded values

### Requirement: Single admin authority per team

Each team MUST have exactly one admin. The team admin MUST approve or reject admission cards, local stats, and team-originated merits for that team only.

#### Scenario: Admin decision scoped to team

- GIVEN a team admin
- WHEN the admin approves a player's admission
- THEN the approval MUST apply only to that team's snapshot

#### Scenario: Non-admin denied

- GIVEN a non-admin team member
- WHEN the member attempts to approve or reject an admission
- THEN the action MUST be denied

### Requirement: Independent approval across teams

Approval or rejection in one team MUST NOT affect the card's status in any other team.

#### Scenario: Rejection does not revoke other teams

- GIVEN a card approved in Team A
- WHEN Team B's admin rejects the card in Team B
- THEN Team A's approval MUST remain valid

### Requirement: Rejection and resubmission

A rejected admission MUST apply only to the rejecting team. The player MUST be able to edit the card and resubmit to that same team.

#### Scenario: Edit and resubmit

- GIVEN a card rejected in Team A
- WHEN the player edits the card and resubmits to Team A
- THEN Team A's admin MUST receive the resubmission for a new decision

#### Scenario: Rejection does not block elsewhere

- GIVEN a card rejected in Team A
- WHEN the player is reviewed or joins in Team B
- THEN Team B's admission MUST proceed independently
