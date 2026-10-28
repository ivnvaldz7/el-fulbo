# Design

## Scope

- Keep the existing team tabs and team-match RPCs.
- Add an admin-only create-match form inside the Matches section.
- After creation, provide a share action that opens the team Matches view with the new match selected.
- Keep the existing member signup action as the confirmation path.
- Use icon badges with `aria-label` and visually hidden text for roles and match status.

## Data flow

`TeamDetailPage` calls `TeamsService.createTeamMatch`, invalidates the team query, and builds a share URL from the team detail route. No group tables, RPCs, or attendance flow are changed.

## Visual hierarchy

The team header remains identity-only. The Matches panel leads with the admin action when applicable, followed by upcoming matches, then historical matches. Card, moderation, and roster concerns remain in their own tabs.

