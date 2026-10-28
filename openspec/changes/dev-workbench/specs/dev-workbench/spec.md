# Development Workbench

## Requirements

### Requirement: Development-only access

The system SHALL expose `/dev` only when the application is not running in production.

#### Scenario: Production request

- **WHEN** a request reaches `/dev` with `NODE_ENV=production`
- **THEN** the route SHALL render not-found

#### Scenario: Unauthenticated local request

- **WHEN** an unauthenticated user requests `/dev` outside production
- **THEN** the route SHALL redirect to `/dev-login`

### Requirement: Read-only diagnostics

The workbench SHALL show the current user's Card Global, legacy Groups cards and Teams memberships without mutating data.

#### Scenario: Card mismatch

- **WHEN** the user has legacy cards but no Teams Card Global
- **THEN** the workbench SHALL show both states separately

### Requirement: Safe local reset

The workbench SHALL explain the local reset command without exposing a destructive reset button.
