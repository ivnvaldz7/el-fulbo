## Technical Design Document: feat-006: Confirm Attendance

### 1. Introduction

This document outlines the technical design for the "feat-006: Confirm Attendance" feature, enabling users to explicitly confirm their attendance for scheduled events or matches. This design aligns with the approved proposal and ensures consistency across all application layers.

### 2. Architecture Decisions

The feature will adhere to a layered architectural approach, ensuring clear separation of concerns and maintainability.

*   **Layered Architecture**: The implementation will span the UI, Backend RPCs, Service Layer, and Data Layer.
*   **API-First Approach**: New RPC endpoints will be defined first to establish the contract between the UI and the backend.
*   **Service-Oriented Logic**: Business logic related to attendance confirmation will reside within a dedicated (or extended) service layer to ensure reusability and testability.
*   **Event-Driven (Optional for Realtime)**: For realtime updates and notifications, an event-driven approach using messaging queues or WebSockets is recommended but will be implemented optionally based on immediate requirements.

### 3. Data Model Adjustments

A new data model will be introduced to manage attendance records.

#### `EventAttendance` Model

A new data model, `EventAttendance`, will be introduced to store the attendance status for each user per event.

*   **`attendanceId`**: UUID (Primary Key)
*   **`eventId`**: Foreign Key (FK) to the `Event` model.
*   **`userId`**: Foreign Key (FK) to the `User` model.
*   **`status`**: Enum (`PENDING`, `CONFIRMED`, `DECLINED`). `PENDING` will be the default state if an explicit status is not set.
*   **`confirmationTimestamp`**: DateTime, nullable. Records when the attendance was confirmed.
*   **`createdAt`**: DateTime. Timestamp of record creation.
*   **`updatedAt`**: DateTime. Timestamp of last update.

#### Relationships

*   **One-to-Many (`Event` to `EventAttendance`)**: An `Event` can have multiple `EventAttendance` records, each corresponding to a different user.
*   **One-to-Many (`User` to `EventAttendance`)**: A `User` can have multiple `EventAttendance` records, each for a different event.

### 4. API Contract Changes (RPCs)

A new RPC endpoint will be exposed for attendance confirmation.

#### `POST /api/events/{eventId}/attendees/{userId}/confirm`

*   **Method**: `POST`
*   **URL**: `/api/events/{eventId}/attendees/{userId}/confirm`
    *   `eventId`: Path parameter, UUID of the event.
    *   `userId`: Path parameter, UUID of the user confirming attendance (this will typically be the authenticated user's ID).
*   **Request Body (Example)**:
    ```json
    {
        "status": "CONFIRMED"
    }
    ```
    *   `status`: String (Enum: "CONFIRMED", "DECLINED"). The current proposal focuses on "CONFIRMED". Other statuses can be added later.
*   **Response (Success - 200 OK)**:
    ```json
    {
        "message": "Attendance confirmed successfully.",
        "attendanceId": "uuid-of-attendance-record"
    }
    ```
*   **Response (Error - e.g., 400 Bad Request, 401 Unauthorized, 404 Not Found)**:
    ```json
    {
        "error": "Error description here."
    }
    ```
*   **Authentication & Authorization**:
    *   The endpoint will require user authentication (e.g., JWT).
    *   Authorization checks will ensure that the `userId` in the path matches the authenticated user's ID, preventing users from confirming attendance for others. For organizers, a separate endpoint or extended authorization logic would be needed for managing other attendees.
*   **Input Validation**:
    *   `eventId` and `userId` will undergo strict UUID format validation.
    *   The `status` in the request body will be validated against the allowed enum values.

### 5. Overall Implementation Approach

#### 5.1. User Interface (UI)

*   **Event Details Screen**: A "Confirm Attendance" button (or toggle) will be added to the event details page. The button's state will reflect the user's current attendance status.
*   **Attendance Status Display**: The UI will prominently display the user's attendance status (e.g., "Confirmed", "Pending", "Declined").
*   **Organizer View**: The event organizer will see a summary or list of confirmed attendees on the event details page.
*   **Interaction**: Upon clicking "Confirm Attendance", a request will be sent to the backend RPC.
*   **Feedback**: User-friendly messages will provide immediate feedback (e.g., "Attendance Confirmed!") and handle any errors gracefully.

#### 5.2. Backend RPC Implementation

*   **Controller/Handler**: A new handler function will be implemented to expose the `POST /api/events/{eventId}/attendees/{userId}/confirm` endpoint.
*   **Middleware**: Authentication and authorization middleware will be applied to protect this endpoint.
*   **Request Parsing & Validation**: The handler will parse path parameters (`eventId`, `userId`) and the request body (`status`), applying strict validation rules.
*   **Service Layer Integration**: The handler will delegate the core business logic to the `AttendanceService` (or `EventService`).

#### 5.3. Service Layer Implementation

*   **`AttendanceService`**:
    *   **New Service**: It is recommended to create a dedicated `AttendanceService` to encapsulate all attendance-related business logic. This promotes modularity.
    *   **Methods**:
        *   `confirmAttendance(eventId: UUID, userId: UUID, status: AttendanceStatus): Promise<EventAttendance>`: This method will contain the core logic.
    *   **Business Logic within `confirmAttendance`**:
        1.  **Validate Existence**: Verify that `eventId` and `userId` correspond to existing records in the database.
        2.  **Pre-conditions**: Check if the event is still open for attendance confirmation (e.g., not past its start date).
        3.  **Concurrency Handling**: Implement mechanisms (e.g., optimistic locking, database transactions) to prevent race conditions when multiple users try to update attendance simultaneously for the same event.
        4.  **Data Layer Update**: Call the appropriate data repository method to create or update the `EventAttendance` record.
        5.  **Realtime/Notification Trigger (Optional)**: If realtime updates or notifications are implemented, this service method will trigger the necessary events.
    *   **Error Handling**: The service will implement robust error handling for various scenarios: "Event not found", "User not found", "User not authorized to confirm for this event", "Event already passed", "Already confirmed/declined".

#### 5.4. Database Changes

*   **Table Creation**: A new table, `event_attendances`, will be created in the database.
    *   Columns will correspond to the `EventAttendance` model fields: `attendance_id` (PK, UUID), `event_id` (FK), `user_id` (FK), `status` (ENUM), `confirmation_timestamp` (DATETIME), `created_at` (DATETIME), `updated_at` (DATETIME).
*   **Indices**:
    *   Single-column indices on `event_id` and `user_id` for efficient foreign key lookups.
    *   A unique composite index on `(event_id, user_id)` to ensure that a user can only have one attendance record per event.
*   **Migrations**: Database migration scripts will be developed to safely apply these schema changes. These scripts will be designed for idempotent execution and rollback capability.
*   **No Local DB Verification**: As per the "auto-chain delivery mode," local database environment verification steps will be skipped. This emphasizes the importance of thorough testing of migration scripts and integration tests in CI/CD pipelines.

#### 5.5. Realtime / Notifications (Optional but Recommended)

*   **Realtime Updates**:
    *   Upon successful attendance confirmation, the `AttendanceService` can publish an event to a message queue (e.g., RabbitMQ, Kafka) or a WebSocket server.
    *   Clients subscribed to event updates (e.g., the event details page for organizers or other participants) can receive this event and update the attendance count or roster in real-time without needing a page refresh.
*   **Notifications**:
    *   The `AttendanceService` can also trigger an in-app notification (or even email/push notification, if integrated) to the event organizer, informing them of a new attendance confirmation.
    *   This notification feature can be made configurable for users to opt-in or out.

### 6. Testing Strategy

*   **Unit Tests**: Comprehensive unit tests will be written for the `AttendanceService` and any utility functions, covering all business logic, edge cases, and error scenarios.
*   **Integration Tests**:
    *   Tests for the new RPC endpoint to ensure proper request handling, validation, authentication, and integration with the service layer.
    *   Tests to verify that attendance records are correctly created, updated, and retrieved from the database.
    *   Tests for database migrations.
*   **UI Tests**: End-to-end (E2E) tests will be developed to simulate user interaction with the "Confirm Attendance" button and verify the UI's behavior and status display.
*   **Contract Tests**: If applicable, contract tests between the UI and backend can be implemented to ensure the RPC contract is upheld.

### 7. Future Considerations

*   **Declining Attendance**: Extend the feature to allow users to explicitly decline attendance.
*   **Updating Attendance**: Enable users to change their attendance status after initial confirmation/declination.
*   **Organizer Management**: Allow event organizers to manage attendance (e.g., mark users as confirmed/declined).
*   **Attendance Limits**: Implement a cap on the number of attendees for an event.
*   **Reminder Notifications**: Send automated reminders to users who have not yet confirmed their attendance.
