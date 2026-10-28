# Design: Development Workbench

## Technical Approach

Use a dynamic server-rendered page that authenticates with the normal Supabase server client, reads only the current user's visible data, and passes a small diagnostic model to a presentational component. Keep the page read-only so a visual debugging surface cannot accidentally erase local data.

## Security Boundary

The route returns not-found in production. It never uses the service-role client and never exposes secrets, database URLs or aggregate data outside the current user's RLS scope.

## Visual Direction

Use the existing Nocturnal Pitch language with nested bezel cards, high-contrast diagnostic labels and asymmetric bento sections. The workbench should feel like a cockpit for the current implementation, not a second product dashboard.
