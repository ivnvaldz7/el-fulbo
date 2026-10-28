# Tasks: Development Workbench

## Phase 1: Workbench

- [x] Add `/dev` route with production guard.
- [x] Show authenticated user, Card Global state, legacy cards and Teams memberships.
- [x] Add links to the main development flows.
- [x] Add a development-only home entry point.
- [x] Add component coverage for the main diagnostic state.
- [x] Verify TypeScript, unit test and production build.

## Phase 2: Environment reset

- [ ] Start Docker Desktop and verify local Supabase health.
- [ ] Run `npm run supabase:reset` against the local environment.
- [ ] Confirm the local auth session is invalidated and the next visit starts at login.
