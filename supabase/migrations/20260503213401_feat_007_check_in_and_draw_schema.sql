
-- Add is_checked_in and checked_in_at to public.event_attendances
ALTER TABLE public.event_attendances
ADD COLUMN is_checked_in boolean NOT NULL DEFAULT FALSE,
ADD COLUMN checked_in_at timestamptz NULL;

-- Update event_status enum to include 'ready_to_draw'
ALTER TYPE public.event_status ADD VALUE 'ready_to_draw';

-- Add RLS policies for the new columns if necessary (considering existing policies)
-- The existing policies for event_attendances should cover these new columns
-- as they are part of the same table and accessed within the same RLS context.
-- No explicit new policies are needed for these specific columns,
-- as access is already controlled at the table level.
