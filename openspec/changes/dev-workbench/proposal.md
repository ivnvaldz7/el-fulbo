# Proposal: Development Workbench

## Intent

Provide a development-only `/dev` workbench to inspect the active session, the current global-card gap, legacy Groups cards, and Teams entry points while the canonical Card Global is being consolidated.

## Scope

### In Scope

- Development-only `/dev` route.
- Read-only diagnostics for the authenticated local user.
- Direct links to Card Global, new Team, Teams hub, Groups and dev login.
- Explicit local reset instructions without a destructive browser action.
- Development-only entry point from the authenticated home screen.

### Out of Scope

- Production access or production diagnostics.
- Destructive reset actions from the browser.
- Changing Groups behavior.
- Resolving the legacy `players` versus `team_cards` source-of-truth conflict.

## Success Criteria

- `/dev` is unavailable when `NODE_ENV=production`.
- Unauthenticated local sessions are redirected to `/dev-login`.
- The page reports current Card Global, legacy card and Teams membership state.
- The main Teams flows are reachable from the workbench.
- The reset remains an explicit local terminal operation.
