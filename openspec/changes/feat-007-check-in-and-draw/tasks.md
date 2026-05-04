# Task Checklist for feat-007: Check-in and Draw

This document outlines the detailed implementation tasks for the "feat-007: Check-in and Draw" feature, broken down into individual work units ready for an `sdd-apply` agent.

## 1. Player Check-in System

*   **Task 1.1: Implement Player Check-in API Endpoint**
    *   **Description:** Create a new API endpoint (`POST /api/matchmaking/check-in`) that allows a player to check into an active match queue.
    *   **Acceptance Criteria:**
        *   Endpoint accepts player ID and match ID.
        *   Validates player and match existence.
        *   Returns success/failure status.
    *   **Dependencies:** Database schema for player status (Task 5.1)

*   **Task 1.2: Add Check-in Validation Logic**
    *   **Description:** Implement server-side validation for player check-in requests, ensuring eligibility (e.g., not already checked in, active session).
    *   **Acceptance Criteria:**
        *   Rejects invalid check-in attempts with appropriate error messages.
        *   Handles concurrency gracefully.
    *   **Dependencies:** Task 1.1

*   **Task 1.3: Update Player Status in Database**
    *   **Description:** Modify the database to reflect a player's "checked-in" status upon successful check-in.
    *   **Acceptance Criteria:**
        *   Player record shows `is_checked_in = TRUE` for the specific match.
        *   Timestamp of check-in is recorded.
    *   **Dependencies:** Task 1.1, Task 5.1

## 2. Real-time Readiness Tracking

*   **Task 2.1: Implement Real-time Readiness Broadcast**
    *   **Description:** Develop a mechanism (e.g., WebSocket or SSE) to broadcast player check-in status updates in real-time to all connected clients.
    *   **Acceptance Criteria:**
        *   When a player checks in, all clients receive an update with the player's new status.
        *   Efficient and scalable broadcast.
    *   **Dependencies:** Task 1.3

*   **Task 2.2: Client-side Readiness Display Integration**
    *   **Description:** Integrate the real-time readiness updates into the client-side UI to display which players have checked in.
    *   **Acceptance Criteria:**
        *   UI shows a live count of checked-in players.
        *   Individual player statuses are visually clear.
    *   **Dependencies:** Task 2.1

## 3. Match Drawing Logic

*   **Task 3.1: Develop Match Drawing Algorithm**
    *   **Description:** Implement the core logic for drawing balanced teams from the pool of checked-in players, considering factors like player skill/rank (if available) and preventing immediate rematches.
    *   **Acceptance Criteria:**
        *   Generates two balanced teams.
        *   Ensures fairness based on defined criteria.
        *   Handles edge cases (e.g., odd number of players, insufficient players for a match).
    *   **Dependencies:** Task 1.3, Task 5.1

*   **Task 3.2: Implement Match Drawing Trigger**
    *   **Description:** Create a mechanism to trigger the match drawing process. This could be after a specific number of players check in, after a timer expires, or manually.
    *   **Acceptance Criteria:**
        *   Match drawing initiates when conditions are met.
        *   Prevents drawing multiple times for the same set of players.
    *   **Dependencies:** Task 2.1, Task 3.1

*   **Task 3.3: Store Drawn Match Data**
    *   **Description:** Persist the details of the drawn match (teams, player assignments) in the database.
    *   **Acceptance Criteria:**
        *   New match record created with all necessary details.
        *   Player records updated with match assignment.
    *   **Dependencies:** Task 3.1, Task 5.2

## 4. Client-side Balancing Integration

*   **Task 4.1: Display Drawn Teams on Client**
    *   **Description:** Update the client-side application to display the newly drawn teams and player assignments once a match is created.
    *   **Acceptance Criteria:**
        *   Players see their assigned teams and opponents.
        *   Clear visual representation of the match.
    *   **Dependencies:** Task 3.3, Task 6.1

## 5. Database Updates

*   **Task 5.1: Update Player Status and Match Queue Schema**
    *   **Description:** Modify existing database schema or create new tables to support player check-in status, readiness tracking, and match queue management.
    *   **Acceptance Criteria:**
        *   New fields for `is_checked_in`, `checked_in_at` in player-related tables.
        *   Potential `match_queue` table or similar.

*   **Task 5.2: Create Match Data Schema**
    *   **Description:** Design and implement the database schema for storing drawn match information, including teams, player assignments, match status, and timestamps.
    *   **Acceptance Criteria:**
        *   `matches` table with `match_id`, `status`, `start_time`, `end_time`.
        *   `match_players` (or similar) table linking players to specific matches and teams.
    *   **Dependencies:** Task 3.3

*   **Task 5.3: Implement Transactional Database Operations**
    *   **Description:** Ensure that check-in and match drawing operations are atomic by using database transactions to prevent inconsistent states.
    *   **Acceptance Criteria:**
        *   All related database updates either succeed or fail together.
        *   Robust error handling for transaction failures.
    *   **Dependencies:** Task 1.3, Task 3.3

## 6. Real-time Notifications

*   **Task 6.1: Implement Match Start Notification Broadcast**
    *   **Description:** Develop a real-time notification system to inform players when a match has been drawn and is ready to start.
    *   **Acceptance Criteria:**
        *   Players receive a notification upon match creation.
        *   Notification includes match details (e.g., "Your match is ready!").
    *   **Dependencies:** Task 3.3

*   **Task 6.2: Client-side Notification Handling**
    *   **Description:** Implement client-side logic to receive and display match start notifications to the user.
    *   **Acceptance Criteria:**
        *   Notifications are clearly visible to the player.
        *   Provides an option to navigate to the match details.
    *   **Dependencies:** Task 6.1
