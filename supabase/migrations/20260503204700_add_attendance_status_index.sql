-- Add index to event_attendances.status for efficient queries
CREATE INDEX attendance_status_idx ON public.event_attendances (status);