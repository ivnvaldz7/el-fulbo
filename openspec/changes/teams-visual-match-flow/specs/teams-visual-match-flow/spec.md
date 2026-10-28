# Teams visual hierarchy and match convocations

## Requirements

### Requirement: Admins can organize a team match
The Matches section MUST expose an admin-only form for date/time, opponent, field, and optional map link, and MUST submit through the existing team match service.

#### Scenario: Admin creates a match
- **WHEN** an admin submits valid match details
- **THEN** the team match is created and the team data is refreshed

#### Scenario: Member views Matches
- **WHEN** a non-admin opens the Matches section
- **THEN** the admin form is not shown and existing signup actions remain available

### Requirement: A match can be shared for confirmation
The team match card MUST expose a share action for scheduled matches that points members to the team Matches section and identifies the selected match.

#### Scenario: Admin shares a scheduled match
- **WHEN** the admin activates share
- **THEN** the app copies or opens a URL containing the team and match context

### Requirement: Badges communicate through icons
Role and match-status badges MUST use semantic icons with accessible labels and MUST NOT rely on text-only pills as the primary visual treatment.

#### Scenario: Badge is rendered
- **WHEN** a member or match card is displayed
- **THEN** the icon has an accessible label describing the role or status

### Requirement: Team navigation remains compact
The team section navigation MUST use compact icon controls at narrow widths and MUST preserve accessible labels for every destination.

#### Scenario: Navigation renders on a phone
- **WHEN** the team detail page is viewed in a narrow viewport
- **THEN** the tabs fit without forcing the full text labels into the layout

### Requirement: Players report position-specific achievements after a match
The team match flow MUST let an admin close a scheduled match with a valid result and MUST show each player a post-match achievement prompt limited to stat kinds allowed by the player's primary or secondary position.

#### Scenario: Admin closes a match
- **WHEN** an admin submits both scores for a scheduled match
- **THEN** the match becomes played and the result is visible in the team history

#### Scenario: Player reports an allowed achievement
- **WHEN** a played match is shown to a player
- **THEN** the player can choose only goals for DEL, assists for MED, and tackles for DEF or ARQ, including any allowed secondary position

#### Scenario: Player has no pending achievement
- **WHEN** the player's allowed stat was already approved for that match
- **THEN** the prompt explains that the achievement was already recorded instead of asking for a duplicate submission

