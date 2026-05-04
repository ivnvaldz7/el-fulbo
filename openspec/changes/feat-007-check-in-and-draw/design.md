## Technical Design Document: feat-007: Check-in and Draw

### 1. Introduction

This document details the technical design for the "feat-007: Check-in and Draw" feature, which implements a real-time mechanism for players to confirm readiness for a match, facilitates the drawing of new matches with fair team distribution, and provides clear progression from match readiness to active gameplay. This design adheres to the approved proposal and ensures consistency across all application layers.

### 2. Architecture Decisions

The feature will adopt a real-time, event-driven architecture to ensure immediate communication and responsiveness, with a clear separation of concerns across layers.

*   **Real-time Event-Driven Architecture**: Leveraging WebSockets or a similar real-time communication protocol for immediate updates between clients and the server regarding player check-ins, match status, and team assignments.
*   **Microservice/Service-Oriented Design**: Business logic for check-in, readiness management, and draw finalization will reside within dedicated services (e.g., `MatchmakingService`, `MatchService`) to maintain modularity and scalability.
*   **Client-Side Balancing with Server-Side Validation**: The team balancing algorithm will be executed on the client-side to offload computation and allow for flexible iteration on balancing logic. However, the server will perform strict validation of the proposed team assignments to prevent tampering and ensure fairness.
*   **Robust State Management**: The server will be responsible for maintaining and synchronizing the state of match readiness, check-ins, and team assignments across all connected clients.

### 3. Data Model Adjustments

Existing data models will be updated, and new structures may be introduced to support the check-in and draw functionalities.

#### `Match` Model Updates

The existing `Match` model will require updates to include new states and potentially references to check-in data.

*   **`status` Field**: Extend the `status` enum to include states like `PENDING_CHECK_IN`, `CHECK_IN_COMPLETE`, `TEAMS_DRAWN`, `IN_PROGRESS`.
*   **`checkInDeadline`**: DateTime, nullable. Timestamp by which all players must check in.
*   **`teamAssignments`**: JSONB/Text field, nullable. Stores the finalized team assignments after the draw. This could be an array of objects, where each object contains `userId` and `teamId` (e.g., "teamA", "teamB").

#### `PlayerMatchStatus` Model (New)

A new model, `PlayerMatchStatus`, could be introduced to track individual player readiness for a specific match, especially if more granular state management is needed beyond just check-in.

*   **`playerMatchStatusId`**: UUID (Primary Key)
*   **`matchId`**: Foreign Key (FK) to the `Match` model.
*   **`userId`**: Foreign Key (FK) to the `User` model.
*   **`checkInStatus`**: Enum (`PENDING`, `CHECKED_IN`, `MISSED_CHECK_IN`).
*   **`teamAssignment`**: String (e.g., "teamA", "teamB"), nullable. Once teams are drawn.
*   **`checkedInAt`**: DateTime, nullable. Timestamp of check-in.
*   **`createdAt`**: DateTime.
*   **`updatedAt`**: DateTime.

#### `Notification` Model Updates

The `Notification` model will be extended to include new types for match-related events.

*   **`type` Field**: Add `MATCH_READY_FOR_CHECK_IN`, `MATCH_CANCELED_NO_CHECK_INS`, `MATCH_TEAMS_ASSIGNED`.
*   **`payload` Field**: Update to support relevant data for these new notification types (e.g., `matchId`, `teamAssignment`, `players`).

#### Relationships

*   **One-to-Many (`Match` to `PlayerMatchStatus`)**: A `Match` can have multiple `PlayerMatchStatus` records, one for each participating player.
*   **One-to-Many (`User` to `PlayerMatchStatus`)**: A `User` can have multiple `PlayerMatchStatus` records across different matches.

### 4. API Contract Changes (RPCs)

New RPC endpoints will be introduced for check-in, real-time status updates, and draw finalization.

#### WebSocket Events/RPCs

Leveraging WebSockets for real-time communication will involve defining specific event types or RPCs.

*   **Client to Server**:
    *   **`CHECK_IN_MATCH`**:
        *   **Description**: Player explicitly checks in for a proposed match.
        *   **Payload**: `{ matchId: UUID }`
        *   **Authorization**: Requires authenticated user. `userId` inferred from session.
    *   **`SUBMIT_TEAM_ASSIGNMENTS`**:
        *   **Description**: Client sends proposed team assignments after running the balancing algorithm.
        *   **Payload**: `{ matchId: UUID, teams: [{ teamId: String, players: [{ userId: UUID, ... }] }, ...] }`
        *   **Authorization**: Requires authenticated user who is part of the match. Server will validate.

*   **Server to Client**:
    *   **`MATCH_READY_FOR_CHECK_IN`**:
        *   **Description**: Informs players that a match is ready for check-in.
        *   **Payload**: `{ matchId: UUID, checkInDeadline: DateTime, players: [{ userId: UUID, username: String, ... }, ...] }`
    *   **`PLAYER_CHECKED_IN`**:
        *   **Description**: Notifies all participants that a player has checked in.
        *   **Payload**: `{ matchId: UUID, userId: UUID, checkedInCount: Number, totalPlayers: Number }`
    *   **`MATCH_CANCELED_NO_CHECK_INS`**:
        *   **Description**: Notifies players that a match was canceled due to insufficient check-ins.
        *   **Payload**: `{ matchId: UUID, reason: String }`
    *   **`MATCH_TEAMS_ASSIGNED`**:
        *   **Description**: Notifies players of their final team assignments and match start.
        *   **Payload**: `{ matchId: UUID, yourTeam: String, teams: [{ teamId: String, players: [{ userId: UUID, username: String, ... }] }, ...] }`
    *   **`MATCH_STATUS_UPDATE`**:
        *   **Description**: Generic update for match status changes.
        *   **Payload**: `{ matchId: UUID, newStatus: MatchStatusEnum, ... }`

#### REST RPCs (Less critical, mainly for initial setup/retrieval)

*   **`GET /api/matches/{matchId}/checkin-status`**:
    *   **Description**: Retrieve the current check-in status for a match.
    *   **Response**: `{ matchId: UUID, status: MatchStatusEnum, playersCheckedIn: [{ userId: UUID, username: String }], totalPlayers: Number }`

### 5. Overall Implementation Approach

#### 5.1. User Interface (UI)

*   **Match Invitation/Lobby Screen**: When a `MATCH_READY_FOR_CHECK_IN` notification is received, the UI will display a prominent call-to-action (e.g., "Check In Now") for the proposed match.
*   **Real-time Readiness Display**: The UI will update in real-time to show which players have checked in, potentially with a progress bar or player list.
*   **Timeout Indicator**: A countdown timer for the check-in deadline will be displayed.
*   **Team Assignment Display**: Upon receiving `MATCH_TEAMS_ASSIGNED`, the UI will clearly show the player's team and other team members.
*   **Error/Cancellation Messages**: User-friendly messages will be displayed for timeouts, failed check-ins, or match cancellations.
*   **Client-Side Balancing Algorithm**: The UI will integrate and execute the previously designed client-side balancing algorithm once triggered by the server. It will then send the results back to the server.

#### 5.2. Backend RPCs / WebSocket Handlers

*   **`MatchmakingController/Handler`**:
    *   **WebSocket Endpoint**: Establish a WebSocket endpoint for real-time communication.
    *   **`CHECK_IN_MATCH` Handler**:
        *   Receives `CHECK_IN_MATCH` events.
        *   Authenticates the user and validates `matchId`.
        *   Delegates to `MatchmakingService` to process the check-in.
        *   Broadcasts `PLAYER_CHECKED_IN` event to all participants.
    *   **`SUBMIT_TEAM_ASSIGNMENTS` Handler**:
        *   Receives `SUBMIT_TEAM_ASSIGNMENTS` events from a client.
        *   Authenticates and authorizes the sender.
        *   Delegates to `MatchmakingService` for team assignment validation and finalization.
        *   Broadcasts `MATCH_TEAMS_ASSIGNED` event upon success.

#### 5.3. Service Layer Implementation

*   **`MatchmakingService` (or `MatchService` extension)**:
    *   **`processCheckIn(matchId: UUID, userId: UUID)`**:
        1.  **Validate Match State**: Ensure the match is in `PENDING_CHECK_IN` state and `checkInDeadline` has not passed.
        2.  **Record Check-in**: Update `PlayerMatchStatus` to `CHECKED_IN` for the `userId` and `matchId`. If `PlayerMatchStatus` doesn't exist, create it.
        3.  **Check for Completion**: After each check-in, verify if all (or sufficient) players have checked in.
        4.  **Initiate Draw**: If check-in is complete, update `Match` status to `CHECK_IN_COMPLETE`, trigger the client-side balancing phase (by sending data to clients), and set a timeout for receiving team assignments.
        5.  **Concurrency Handling**: Ensure atomic updates for check-in status to prevent race conditions.
    *   **`finalizeTeamAssignments(matchId: UUID, proposedTeams: TeamAssignmentPayload)`**:
        1.  **Validate Match State**: Ensure the match is in `CHECK_IN_COMPLETE` state and waiting for team assignments.
        2.  **Validate Proposed Teams**:
            *   Verify all `CHECKED_IN` players are assigned to a team.
            *   Perform server-side checks for basic fairness and integrity of the team assignments (e.g., total players match, no duplicate players, basic skill balancing metrics are within acceptable thresholds).
            *   This validation is crucial to prevent client-side tampering.
        3.  **Persist Assignments**: Update the `Match` record with `teamAssignments` and change status to `TEAMS_DRAWN` or `IN_PROGRESS`.
        4.  **Broadcast**: Send `MATCH_TEAMS_ASSIGNED` notifications to all participants.
    *   **Check-in Timeout Mechanism**:
        *   Implement a scheduled task or a lightweight timer for each `PENDING_CHECK_IN` match.
        *   If the `checkInDeadline` is reached and not all required players have checked in, the service will:
            *   Cancel the match (`Match.status = CANCELED`).
            *   Notify all involved players (`MATCH_CANCELED_NO_CHECK_INS`).
            *   Potentially re-queue players for matchmaking.

#### 5.4. Database Changes

*   **`matches` table**:
    *   Add new `status` enum values: `PENDING_CHECK_IN`, `CHECK_IN_COMPLETE`, `TEAMS_DRAWN`, `IN_PROGRESS`.
    *   Add `check_in_deadline` (DATETIME, nullable).
    *   Add `team_assignments` (JSONB/TEXT, nullable).
*   **New `player_match_statuses` table**:
    *   `player_match_status_id` (UUID, PK)
    *   `match_id` (UUID, FK, NOT NULL)
    *   `user_id` (UUID, FK, NOT NULL)
    *   `check_in_status` (ENUM: `PENDING`, `CHECKED_IN`, `MISSED_CHECK_IN`, NOT NULL, DEFAULT `PENDING`)
    *   `team_assignment` (VARCHAR, nullable, e.g., 'teamA', 'teamB')
    *   `checked_in_at` (DATETIME, nullable)
    *   `created_at` (DATETIME, NOT NULL)
    *   `updated_at` (DATETIME, NOT NULL)
*   **Indices**:
    *   Unique composite index on `(match_id, user_id)` in `player_match_statuses`.
    *   Indices on `match_id` and `user_id` for efficient lookups.
*   **`notifications` table**:
    *   Update `type` enum to include `MATCH_READY_FOR_CHECK_IN`, `MATCH_CANCELED_NO_CHECK_INS`, `MATCH_TEAMS_ASSIGNED`.
*   **Migrations**: Database migration scripts will be written to apply these schema changes safely.
*   **No Local DB Verification**: Consistent with auto-chain delivery, local database verification will be skipped, emphasizing robust migration scripts and integration tests.

#### 5.5. Real-time Notifications

*   **WebSocket Server**: A dedicated WebSocket server (or an integrated component within the backend) will manage real-time connections.
*   **Event Broadcasting**: The `MatchmakingService` will trigger messages to be broadcast via WebSockets to relevant clients for:
    *   `MATCH_READY_FOR_CHECK_IN`
    *   `PLAYER_CHECKED_IN`
    *   `MATCH_CANCELED_NO_CHECK_INS`
    *   `MATCH_TEAMS_ASSIGNED`
*   **Client Subscriptions**: Clients will subscribe to specific match-related topics or individual player channels to receive relevant updates.

### 6. Testing Strategy

*   **Unit Tests**:
    *   Thorough unit tests for `MatchmakingService` logic, covering check-in processing, timeout handling, and team assignment validation.
    *   Tests for data model mutations and status transitions.
*   **Integration Tests**:
    *   Tests for WebSocket handlers to ensure proper event processing, authorization, and service layer integration.
    *   Tests to verify real-time event broadcasting.
    *   End-to-end tests for the entire check-in and draw flow, simulating multiple clients.
    *   Database migration tests.
*   **Client-Side Tests**:
    *   Unit tests for the client-side balancing algorithm.
    *   Integration tests for UI components interacting with real-time updates and check-in actions.
*   **Concurrency Tests**: Simulate multiple simultaneous check-ins to ensure no race conditions or data corruption.

### 7. Future Considerations

*   **Player Re-queuing Logic**: More sophisticated logic for re-queuing players after a canceled match.
*   **Manual Draw Override**: Option for event organizers to manually initiate or override a draw.
*   **Advanced Balancing Parameters**: Incorporate more player data (e.g., roles, preferred positions) into the balancing algorithm.
*   **Dynamic Check-in Requirements**: Allow configurable number of required check-ins (e.g., 70% of players).