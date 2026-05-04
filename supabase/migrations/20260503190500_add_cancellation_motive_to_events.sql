-- Add cancellation_motive to events table
ALTER TABLE public.events
ADD COLUMN cancellation_motive TEXT;