# AGENTS.md

Project: El Fulbo — PWA para organizar fulbito amateur.

## Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript strict + noUncheckedIndexedAccess
- **Styling**: Tailwind CSS v4 + Nocturnal Pitch design system
- **Backend**: Supabase (Postgres, RLS, RPCs, Realtime)
- **State**: TanStack React Query + Zustand
- **Validation**: Zod
- **PWA**: Serwist
- **Auth**: Supabase SSR (Google OAuth)

## Project Structure

```
el-fulbo/
├── src/
│   ├── app/                   ← Next.js App Router (pages + API routes)
│   ├── components/
│   │   ├── ui/                ← Atomic components (modal, panel, etc.)
│   │   ├── auth/              ← Google sign-in
│   │   ├── cards/             ← Player card preview
│   │   ├── events/            ← MVP panels, event form
│   │   ├── event-attendees-list/
│   │   ├── groups/            ← Create group, dashboard, etc.
│   │   ├── notifications/     ← Badge, item, push opt-in
│   │   ├── onboarding/        ← Wizard
│   │   ├── phantom/           ← Modal, resolution widget
│   │   ├── players/           ← Profile tabs, stats view, photo upload
│   │   └── share/             ← Share buttons, cards, match summary
│   ├── hooks/                 ← Custom React hooks
│   ├── lib/
│   │   ├── services/          ← Business logic (service layer)
│   │   ├── validations/       ← Zod schemas (único lugar)
│   │   ├── supabase/          ← DB clients (client, server, service)
│   │   ├── types/             ← Domain types
│   │   └── utils/             ← Pure utility functions
│   └── (co-located *.test.*)  ← Unit tests junto al source
├── tests/
│   ├── helpers/               ← MSW handlers, test-utils, fixtures
│   ├── integration/           ← RPC + RLS + flow tests (vitest)
│   └── e2e/                   ← Playwright smoke tests
├── scripts/                   ← Dev/deploy utilities (reset, check, setup)
├── specs/                     ← SDD specs (único source of truth)
│   ├── 00-foundation/
│   ├── 01-domain/
│   ├── 02-flows/
│   ├── 03-features/
│   ├── 04-contracts/
│   └── 05-quality/
├── docs/
│   ├── design/                ← Design system, screenshots
│   └── runtime/               ← Runtime docs
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

Rule: if a component has auxiliary files (test, sub-components), it goes in its own dir. If it's a single file, it goes loose in the domain folder.

## Testing Strategy

### Pyramid
```
         ┌──────────────┐
         │  E2E (smoke) │  ← Playwright, pocos críticos
         ├──────────────┤
         │ Integration  │  ← RPCs + RLS + flows completos
         ├──────────────┤
         │    Unit      │  ← servicios, validaciones, utilidades
         └──────────────┘
```

### Where tests live
- **Unit tests**: co-located next to source (`src/**/*.test.ts`)
- **Integration tests**: `tests/integration/` — run against local Supabase
- **E2E tests**: `tests/e2e/` — Playwright
- **Test helpers**: `tests/helpers/` — MSW, test-utils, fixtures

### Scripts
```json
{
  "test": "vitest run",
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

### For NEW features

```
1. sdd-explore    → Investigate codebase + requirements
2. sdd-propose    → Write change proposal
3. sdd-design     → Technical design (architecture)
4. sdd-spec       → Specifications + scenarios
5. sdd-tasks      → Task breakdown
6. sdd-apply      → Implement code
   └── skill: impeccable (if UI changes)
   └── skill: emil-design-eng (if new components)
7. sdd-verify     → Validate against specs
8. judgment-day   → Adversarial review (for critical changes)
9. sdd-archive    → Archive change
```

### For BUGS

```
1. sdd-explore    → Understand bug + codebase
2. sdd-apply      → Fix + test
3. sdd-verify     → Confirm fix
```

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

### Skills
- `impeccable` — UI design, polish, review
- `emil-design-eng` — new UI components with micro-interactions
- `judgment-day` — adversarial review for critical changes
- `sdd-*` — SDD workflow agents
- `webapp-testing` — Playwright + browser testing

## Rules

- Use service layer
- Use Zod validation
- Respect TypeScript strict
- No comments in code
- Co-locate unit tests next to source
- Conventional commits
- Always verify with tsc --noEmit and tests after changes
