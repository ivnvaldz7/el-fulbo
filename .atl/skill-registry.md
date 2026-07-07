# Agent Skill Registry

This registry maps project standards and skill triggers for El Fulbo. The orchestrator injects the compact rules into sub-agent prompts.

## Compact Rules

- Project: El Fulbo — PWA para organizar fulbito amateur.
- Framework: Next.js 16 App Router + React 19.
- Language: TypeScript 6 strict with `noUncheckedIndexedAccess`.
- Styling: Tailwind CSS v4 + Nocturnal Pitch design system.
- Backend: Supabase Postgres, RLS, RPCs, Realtime, Storage.
- State: TanStack React Query v5 + Zustand v5.
- Validation: Zod v3 for all user input.
- PWA/Push: Serwist v9 + web-push/VAPID.
- Testing: Vitest v4, Testing Library, MSW v2, Playwright, Supabase integration tests.
- Architecture: service layer for business logic in `src/lib/services/`; no business logic in pages or API routes.
- Naming: kebab-case files; services use `*.service.ts`; co-located unit tests use `*.test.ts(x)`.
- Production constraints: Vercel Hobby cron jobs must run at most once per day.
- Workflow: SDD for features larger than a one-liner; specs first, tests first, verify with typecheck and unit tests after changes.
- Constraints: never build after changes; conventional commits only; no AI attribution in commits; no production code comments unless genuinely necessary.

## User Skills

| Skill | Trigger | Compact instruction |
|-------|---------|---------------------|
| go-testing | Go tests, Bubbletea TUI testing | Load before writing Go tests; apply project Go testing patterns. |
| skill-creator | Creating or updating AI agent skills | Load before creating skill instructions or skill files. |
| branch-pr | Creating PRs or preparing changes for review | Follow issue-first PR workflow and conventional commit constraints. |
| issue-creation | Creating GitHub issues or bug/feature tickets | Follow issue-first workflow and capture actionable context. |
| judgment-day | Adversarial review / dual review / "judgment day" | Run two independent blind reviews, synthesize findings, fix and re-review. |
| design-taste-frontend | Landing pages, portfolios, redesigns | Audit first; ship premium, non-templated UI. |
| high-end-visual-design | New premium UI components | Use high-end spacing, typography, shadows, motion and avoid generic AI defaults. |
| redesign-existing-projects | Upgrading existing pages | Improve visual quality without breaking behavior. |
| webapp-testing | Local web app browser testing | Use Playwright/browser verification for frontend behavior and screenshots. |

## Project Conventions

- Root instructions: `AGENTS.md`.
- Specs source of truth: `specs/`.
- Current operational context: `docs/CURRENT_STATE.md`.
- Notification guidelines: `docs/NOTIFICATIONS_GUIDELINES.md`.
- Card product guidelines: `docs/CARDS_GUIDELINES.md`.
