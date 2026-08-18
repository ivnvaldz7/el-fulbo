# Tasks: Fix React Rules of Hooks Violation in TeamDetailPage

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~35 (move useEffect block up) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Fix — Move useEffect Before Conditional Returns

- [x] 1.1 In `src/app/teams/[teamId]/page.tsx`, move the `useEffect` block (lines 69–125, real-time channel subscription) from after `const canManage = team.role === 'admin'` (line 66) to immediately after `queryClient` declaration (after line 35) and before the `if (loading)` guard (line 47)
- [x] 1.2 Run `tsc --noEmit` to confirm no type errors — the moved code has no type dependencies on anything below its new position

## Phase 2: Verify

- [x] 2.1 Run `vitest run --dir src` to confirm all unit tests pass
- [ ] 2.2 Verify the component renders correctly: loading state shows spinner, loaded state shows team panels, real-time subscription attaches on mount regardless of loading state
