# feat-007: Check-in and Draw Proposal

## Intent

This change aims to implement a robust and real-time "check-in and draw" mechanism for matches. The primary goal is to allow players to confirm their readiness for a match, facilitate the drawing of new matches once a set of players is ready, and ensure a fair and balanced team distribution. This feature is critical for enhancing the user experience by providing a clear progression flow from match readiness to active gameplay.

## Scope

### In-Scope

*   **Player Check-in Mechanism**: Implement the functionality for players to explicitly "check-in" for a proposed match. This will likely involve a user interface update to display match invitations and a button/action to confirm readiness.
*   **Real-time Readiness Tracking**: Develop real-time updates for match readiness, allowing all participating players and the system to see who has checked in.
*   **Match Drawing Logic**: Implement the server-side logic to initiate a "draw" when all (or a sufficient number of) players have checked in for a match.
*   **Client-Side Balancing Algorithm Integration**: Integrate the previously explored client-side balancing algorithm to fairly distribute checked-in players into teams. The algorithm will be executed on the client, with the result sent to the server for validation and finalization.
*   **Database Updates**:
    *   Add a new notification type, `match_ready`, to inform clients when a match is ready for check-in.
    *   Potentially update existing match states or introduce new states to reflect the check-in and drawing phases.
    *   Store the results of the team draw in the database.
*   **Real-time Notifications**: Ensure players receive real-time notifications about match status changes, including invitations, check-in prompts, and final team assignments.
*   **Error Handling and Timeouts**: Implement robust error handling for failed check-ins, timeouts for players who don't check in, and mechanisms to re-queue players or re-draw matches if necessary.

### Out-of-Scope

*   Detailed UI/UX design beyond basic functional elements for check-in.
*   Complex ranking or Elo system adjustments based on match outcomes (this is a separate feature).
*   Spectator mode functionality for active matches.
*   Comprehensive anti-cheat measures (handled in a different system/phase).

## Approach

The implementation will follow a real-time, event-driven approach, leveraging WebSocket or similar technologies for immediate communication between clients and the server.

1.  **Client-Side Check-in Initiation**:
    *   When a match is proposed, the server will send a `match_ready` notification to all involved players.
    *   The client application will display a clear prompt for the player to "check-in."
    *   Upon check-in, the client sends a `CHECK_IN` event to the server.

2.  **Server-Side Readiness Management**:
    *   The server will maintain the state of check-ins for each proposed match.
    *   It will track which players have checked in and broadcast updates to all participants in real-time.
    *   A configurable timeout will be implemented. If all players do not check in within this period, the match will be canceled, and players will be notified and potentially re-queued.

3.  **Client-Side Balancing Algorithm Execution**:
    *   Once a sufficient number of players (e.g., all players) have checked in, the server will trigger the client-side balancing algorithm.
    *   The server will send the necessary player data (e.g., skill ratings, preferences) to the clients.
    *   The client-side algorithm will run to determine balanced teams and send the proposed team assignments back to the server.
    *   **Rationale for Client-Side**: Distributing the balancing computation load and allowing for faster iteration on balancing logic without requiring server deployments. Server will validate results to prevent tampering.

4.  **Server-Side Draw Finalization**:
    *   The server will receive the proposed team assignments from the client.
    *   It will validate the integrity and fairness of the proposed teams (e.g., ensuring all checked-in players are assigned, basic balancing metrics are met).
    *   Upon successful validation, the server will finalize the team assignments, persist them to the database, and update the match status to `IN_PROGRESS` or similar.

5.  **Real-time Team Assignment Notifications**:
    *   After the draw, the server will send a real-time notification to all participating players, informing them of their team assignment and the start of the match. This notification will include details like team members, opposing team members, and any relevant match identifiers.

6.  **Database Changes**:
    *   The `notifications` table will be updated to include a `match_ready` type.
    *   New fields or tables may be introduced to store player check-in status and finalized team compositions.

This approach ensures a responsive and engaging user experience while maintaining server-side control and validation over critical match mechanics. The use of a client-side balancing algorithm offloads computation and provides flexibility, with the server acting as the ultimate arbiter of match fairness.
