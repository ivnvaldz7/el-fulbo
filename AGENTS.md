# AGENTS.md

Project: El Fulbo — PWA para organizar fulbito amateur.
Status: **V2 complete** — 16 features shipped, en producción.

## Stack

- **Runtime**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript 6 strict (`noUncheckedIndexedAccess`)
- **Styling**: Tailwind CSS v4 + Nocturnal Pitch design system
- **Backend**: Supabase (Postgres, RLS, RPCs, Realtime, Storage)
- **State**: TanStack React Query v5 + Zustand v5
- **Validation**: Zod v3
- **PWA**: Serwist v9
- **Auth**: Supabase SSR (Google OAuth)
- **Testing**: Vitest v4 + Testing Library + MSW v2 + Playwright
- **Push**: web-push (VAPID)
- **Deploy**: Vercel (Hobby plan, daily crons)

## Project Structure

```
el-fulbo/
├── src/
│   ├── app/                   ← Next.js App Router (pages + API routes)
│   │   ├── api/               ← API routes (jobs, subscriptions, notifications)
│   │   ├── groups/[id]/       ← Group dashboard, events, settings, owners
│   │   ├── profile/           ← User profile + base card
│   │   ├── notifications/     ← Notification feed
│   │   ├── settings/          ← User settings (notification prefs)
│   │   └── ...                ← auth, invite, join, welcome, onboarding
│   ├── components/
│   │   ├── ui/                ← Atomic components (modal, panel, immersive-screen)
│   │   ├── auth/              ← Google sign-in
│   │   ├── cards/             ← Player card preview + tests
│   │   ├── events/            ← MVP panels, event form, share event, attendees
│   │   ├── event-attendees-list/
│   │   ├── groups/            ← Create group, dashboard + tests
│   │   ├── notifications/     ← Badge, item, push opt-in
│   │   ├── onboarding/        ← Wizard
│   │   ├── phantom/           ← Modal, resolution widget
│   │   ├── players/           ← Profile tabs, stats view, photo upload
│   │   └── share/             ← Share buttons, shareable card, match summary
│   ├── hooks/                 ← use-notifications, use-push-subscription + tests
│   ├── lib/
│   │   ├── services/          ← Business logic (18 services, all tested)
│   │   ├── validations/       ← Zod schemas (9 schema files)
│   │   ├── supabase/          ← DB clients (client, server, service-role)
│   │   ├── providers/         ← React Query provider
│   │   ├── types/             ← Domain types
│   │   └── utils/             ← Pure utility functions
│   └── (co-located *.test.*)  ← Unit tests next to source
├── tests/
│   ├── helpers/               ← MSW handlers, test-utils, fixtures
│   ├── integration/           ← RPC + RLS tests (vitest, real Supabase)
│   └── e2e/                   ← Playwright smoke tests
├── supabase/
│   ├── migrations/            ← 58 migration files
│   └── config.toml
├── scripts/                   ← Dev/deploy utilities (reset, check, setup)
├── specs/                     ← SDD specs (source of truth)
│   ├── 00-foundation/
│   ├── 01-domain/
│   ├── 02-flows/
│   ├── 03-features/           ← feat-001 through feat-016
│   ├── 04-contracts/
│   ├── 05-quality/
│   ├── _archive/
│   ├── _backlog.md
│   └── _v2-vision.md
├── docs/
│   ├── design/                ← Nocturnal Pitch, stitch exports
│   └── runtime/
└── context/                   ← Agent context (handoff, current-state)
```

## Naming Conventions

| Type | Style | Example |
|------|-------|---------|
| Components | kebab-case.tsx | `player-card-preview.tsx` |
| Component dirs | kebab-case/ | `event-attendees-list/` |
| Services | kebab-case.service.ts | `events.service.ts` |
| Validations | kebab-case.ts | `onboarding.ts` |
| Hooks | kebab-case.ts | `use-notifications.ts` |
| Tests | `*.test.ts(x)` co-located | `events.service.test.ts` |
| Integration tests | kebab-case | `feat-008-load-match-result-rpc.test.ts` |
| E2E tests | kebab-case.spec.ts | `login.spec.ts` |
| Migrations | timestamp_description.sql | `20260626034526_update_card_inheritance_first_group.sql` |

Rule: if a component has auxiliary files (test, sub-components), it goes in its own dir. If it's a single file, it goes loose in the domain folder.

## Testing Strategy

### Pyramid
```
         ┌──────────────┐
         │  E2E (smoke) │  ← Playwright, critical paths only
         ├──────────────┤
         │ Integration  │  ← RPCs + RLS + flows (real Supabase)
         ├──────────────┤
         │    Unit      │  ← services, validations, utilities, hooks
         └──────────────┘
```

### Where tests live
- **Unit tests**: co-located next to source (`src/**/*.test.ts(x)`)
- **Integration tests**: `tests/integration/` — run against local Supabase
- **E2E tests**: `tests/e2e/` — Playwright
- **Test helpers**: `tests/helpers/` — MSW handlers, test-utils, fixtures

### Scripts
```json
{
  "test": "vitest run --dir src",
  "test:unit": "vitest run --dir src",
  "test:integration": "npm run supabase db reset && vitest run --dir tests/integration",
  "test:e2e": "playwright test",
  "test:coverage": "vitest run --coverage"
}
```

### Merge criteria
- `tsc --noEmit` passes (0 errors)
- `vitest run --dir src` passes (all unit tests)
- Integration tests pass for affected RPCs
- E2E smoke passes before deploy

## Implementation Workflow

**ALL new work follows SDD (Spec-Driven Development).** No exceptions.

### For NEW features

```
1. /sdd-explore    → Investigate codebase + requirements
2. /sdd-new        → Proposal + specs + design + tasks (interactive)
   └── or /sdd-ff  → Fast-forward all planning phases
3. /sdd-apply      → Implement code in batches
   └── skill: design-taste-frontend (if landing/redesign)
   └── skill: high-end-visual-design (if new UI)
4. /sdd-verify     → Validate against specs
5. judgment-day    → Adversarial review (for critical changes)
6. /sdd-archive    → Close and persist
```

### For BUGS

```
1. /sdd-explore    → Understand bug + codebase context
2. /sdd-apply      → Fix + test
3. /sdd-verify     → Confirm fix
```

### For QUICK FIXES (typos, config, one-liner)

No SDD needed. Direct commit with conventional message.

### Branch Strategy

Each new feature or significant change opens a branch:
- `feat/<name>` — new features
- `fix/<name>` — bug fixes
- `chore/<name>` — maintenance, restructuring

Before implementing, ASK: "¿Abro rama para esto o va directo a master?"

### Implementation Rules

1. **Specs FIRST** — nothing is coded without a spec
2. **Test FIRST** — specs define scenarios, task checklists include tests
3. **Service layer** — ALL business logic in `src/lib/services/`, never in pages or API routes
4. **Zod validation** — ALL user input passes through Zod before reaching the service
5. **TypeScript strict** — `noUncheckedIndexedAccess` is mandatory
6. **No comments** — code should be self-explanatory
7. **TDD for RPCs** — new RPCs have integration tests BEFORE implementation
8. **Verify after changes** — always run `tsc --noEmit` and `vitest run --dir src`

## Skills

| Skill | When |
|-------|------|
| `sdd-*` | SDD workflow (explore, propose, spec, design, tasks, apply, verify, archive) |
| `design-taste-frontend` | Landing pages, portfolios, redesigns |
| `high-end-visual-design` | New UI components, premium aesthetics |
| `redesign-existing-projects` | Upgrading existing pages to premium |
| `judgment-day` | Adversarial review for critical changes |
| `webapp-testing` | Playwright + browser testing |
| `branch-pr` | PR creation workflow |
| `issue-creation` | GitHub issue creation |

## Shipped Features (V2)

All 16 features implemented and in production:

| # | Feature | Key files |
|---|---------|-----------|
| 001 | Onboarding | `onboarding.service.ts`, wizard components |
| 002 | Create Group | `groups.service.ts`, group creation flow |
| 003 | Join Group | `invite.service.ts`, invite/reintegration RPCs |
| 004 | Admin Dashboard | `admin-tasks.service.ts`, dashboard page |
| 005 | Create Event | `events.service.ts`, `EventForm.tsx` |
| 006 | Confirm Attendance | `update_attendance` RPC, attendance buttons |
| 007 | Check-in & Draw | `confirm_draw` RPC, team assignment |
| 008 | Load Result + MVP | `load_match_result` RPC, MVP voting |
| 009 | Boost System | `boost.ts`, card badges |
| 010 | Share Card | `share.ts`, `ShareableCard`, Web Share API |
| 011 | Manage Owners | `owners.service.ts`, temporary owners, cron |
| 012 | Notifications | Push, badge, feed, digest crons |
| 013 | Phantom Player | Check-in creation, auto-archive cron |
| 014 | Export Data | ZIP server-side, JSON + CSV |
| 015 | Player Stats | Profile tabs, stats aggregate VIEW |
| 016 | Share Event | `share-event-modal.tsx`, copy/native/WhatsApp |

## Rules

- Use service layer for ALL business logic
- Use Zod validation for ALL user input
- Respect TypeScript strict mode
- No comments in production code
- Co-locate unit tests next to source
- Conventional commits (no AI attribution)
- Always verify with `tsc --noEmit` and `vitest run --dir src` after changes
- SDD for any feature larger than a one-liner
