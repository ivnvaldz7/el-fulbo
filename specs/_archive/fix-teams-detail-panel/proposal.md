# Proposal: Fix React Rules of Hooks violation in TeamDetailPage

## Intent

Fix a React Rules of Hooks violation where `useEffect` (real-time subscription) is placed after conditional early returns in `TeamDetailPage`. When `loading=true`, 7 hooks execute and the component returns early. When data loads and `loading=false`, 8 hooks execute — React detects the changing hook count, causing warnings or crashes in React 19.

## Scope

### In Scope
- Move `useEffect` (lines 69–125) above the `if (loading)` early return in `src/app/teams/[teamId]/page.tsx`
- Verify no behavioral changes to real-time subscriptions

### Out of Scope
- Refactoring the component to extract panels or loading states
- Any other hooks violations elsewhere in the codebase
- Changing subscription logic or channel configuration

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None (pure refactor — no spec-level behavior change)

## Approach

Move the existing `useEffect` block (real-time channel subscription) from below the `if (loading)` guard to immediately after `useQuery` and before the loading check. All dependencies (`teamId`, `queryClient`, `supabase`) are already defined at the top of the component. The effect's cleanup function remains unchanged. No other code modifications needed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/teams/[teamId]/page.tsx` | Modified | Move `useEffect` before early returns |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Subscription fires on initial render during loading | Low | Effect subscribes to a channel; no data is invalidated until queries exist. `invalidateQueries` no-ops if no cache entry. |
| Channel cleanup doesn't run if component unmounts during loading | Low | `useEffect` runs on mount and returns cleanup; React guarantees cleanup on unmount even when component hasn't rendered fully. |

## Rollback Plan

Revert the single change in `src/app/teams/[teamId]/page.tsx` — move `useEffect` back to its original position below the conditional returns.

## Dependencies

- None

## Success Criteria

- [ ] `useEffect` is always called regardless of loading state — no React hooks warnings
- [ ] Team subscription still correctly invalidates queries on DB changes
- [ ] `tsc --noEmit` passes
- [ ] `vitest run --dir src` passes
- [ ] All existing team panel tests pass
