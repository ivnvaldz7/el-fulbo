## Proposal: feat-006: Confirm Attendance

### 1. Intent

The primary intent of this feature is to enable users to explicitly confirm their attendance for scheduled events or matches. This confirmation will provide clear visibility to event organizers and other participants regarding who will be present, facilitating better planning and coordination. It aims to improve reliability and reduce uncertainty around participant numbers.

### 2. Scope

This change will impact multiple layers of the application, from the user interface to the persistent storage and notification systems. The scope includes:

*   **UI/UX**: Adding an intuitive mechanism for users to confirm attendance.
*   **Backend RPCs**: Introducing new endpoints for receiving and processing attendance confirmations.
*   **Service Layer**: Implementing business logic to handle attendance states, validations, and associated actions.
*   **Data Models**: Extending existing models or introducing new ones to store attendance status.
*   **Database**: Applying schema changes to accommodate new attendance data.
*   **Realtime/Notifications**: Optionally providing immediate feedback or updates to relevant parties upon attendance confirmation.

### 3. Approach

#### 3.1. User Interface (UI)

*   **Event Details Screen**: A prominent "Confirm Attendance" button or toggle will be added to the event or match details screen for each user.
*   **Attendance Status Display**: The UI will clearly show the user's current attendance status (e.g., "Confirmed", "Pending", "Declined").
*   **Organizer View**: For event organizers, a list of confirmed attendees will be visible, potentially with a count or detailed roster.
*   **Error Handling**: User-friendly messages will be displayed for any errors during the confirmation process.

#### 3.2. Backend RPCs

*   **`POST /api/events/{eventId}/attendees/{userId}/confirm`**: A new RPC endpoint will be created to allow a user to confirm their attendance for a specific event. This endpoint will receive a simple payload (e.g., `{ status: "confirmed" }` or similar).
*   **Authentication & Authorization**: The endpoint will be protected to ensure only authenticated users can confirm attendance for themselves, or authorized organizers can manage attendance for others (if that's a future requirement, for now, self-confirmation is the focus).
*   **Input Validation**: Strict validation will be applied to `eventId` and `userId` to prevent invalid requests.

#### 3.3. Service Layer

*   **Attendance Service**: A new service, `AttendanceService`, will be introduced or an existing `EventService` will be extended.
*   **Business Logic**:
    *   Validate the `eventId` and `userId` against existing records.
    *   Check for any pre-conditions (e.g., event is still open for attendance confirmation).
    *   Update the user's attendance status in the data layer.
    *   Trigger any necessary real-time updates or notifications.
    *   Handle concurrency to prevent race conditions during updates.
*   **Error Handling**: Implement comprehensive error handling for scenarios like "event not found", "user not authorized", or "already confirmed".

#### 3.4. Data Models

*   **`EventAttendance` Model**: A new data model `EventAttendance` will likely be introduced. This model could include:
    *   `attendanceId` (UUID)
    *   `eventId` (Foreign Key to `Event` model)
    *   `userId` (Foreign Key to `User` model)
    *   `status` (Enum: `PENDING`, `CONFIRMED`, `DECLINED`)
    *   `confirmationTimestamp` (DateTime, nullable)
    *   `createdAt` (DateTime)
    *   `updatedAt` (DateTime)
*   **Relationship**: Establish a one-to-many relationship where one `Event` can have many `EventAttendance` records, and one `User` can have many `EventAttendance` records.

#### 3.5. Database Changes

*   **New Table**: A new `event_attendances` table will be created based on the `EventAttendance` model.
*   **Indices**: Appropriate indices will be added to `event_attendances` on `eventId`, `userId`, and a composite index on `(eventId, userId)` for efficient lookups and uniqueness constraints.
*   **Migrations**: Database migrations will be written to safely apply these schema changes to the production environment.
*   **No Local DB Verification**: As per the "auto-chain delivery mode," we will skip local database environment verification steps. This implies a reliance on robust migration scripts and integration tests in higher environments.

#### 3.6. Realtime / Notifications

*   **Realtime Updates (Optional but Recommended)**:
    *   Upon a user confirming attendance, a real-time event (e.g., via WebSockets or a messaging queue) could be broadcast to inform other participants or the event organizer.
    *   This could update the attendance count on the event details page without requiring a page refresh.
*   **Notifications (Optional)**:
    *   An in-app notification could be sent to the event organizer when a new user confirms attendance.
    *   This can be configured to be opt-in to avoid notification fatigue.

---