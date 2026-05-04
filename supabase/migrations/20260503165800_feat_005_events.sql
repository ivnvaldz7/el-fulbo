-- Add new notification type
COMMIT;
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'event_updated';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'event_rescheduled';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'event_cancelled';
BEGIN;

-- Drop existing functions to prevent signature conflicts during migration
DROP FUNCTION IF EXISTS public.create_event(UUID, public.modality, TEXT, TEXT, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS public.update_event(UUID, public.modality, TEXT, TEXT, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS public.cancel_event(UUID, TEXT);

-- Function to check if the current user is a group administrator
CREATE OR REPLACE FUNCTION public.is_group_admin(gid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.players
    WHERE group_id = gid
      AND user_id = auth.uid()
      AND stats_status = 'approved'
      AND is_admin = TRUE
  ) INTO is_admin;
  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the current user is a group owner
CREATE OR REPLACE FUNCTION public.is_group_owner(gid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = gid
      AND owner_id = auth.uid()
  ) INTO is_owner;
  RETURN is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure 'field_maps_url' column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'events'
        AND column_name = 'field_maps_url'
    ) THEN
        ALTER TABLE public.events ADD COLUMN field_maps_url TEXT;
    END IF;
END $$;

-- Ensure 'notes' column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'events'
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.events ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Drop 'title' column if it exists, as 'field_name' is preferred
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'events'
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.events DROP COLUMN title;
    END IF;
END $$;

-- RPC to create an event and notify approved players
CREATE OR REPLACE FUNCTION public.create_event(
  p_group_id UUID,
  p_modality public.modality,
  p_field_name TEXT,
  p_field_maps_url TEXT,
  p_scheduled_at TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Permission validation
  IF NOT (public.is_group_admin(p_group_id) OR public.is_group_owner(p_group_id)) THEN
      RAISE EXCEPTION 'Unauthorized: Only group owners or admins can create events.';
  END IF;

  -- Date validations
  IF p_scheduled_at < now() + interval '1 hour' THEN
      RAISE EXCEPTION 'Scheduled time must be at least 1 hour in the future.';
  END IF;
  IF p_scheduled_at > now() + interval '90 days' THEN
      RAISE EXCEPTION 'Scheduled time cannot be more than 90 days in the future.';
  END IF;

  -- Insert event
  INSERT INTO public.events (
    group_id,
    scheduled_at,
    field_name,
    modality,
    created_by_user_id,
    field_maps_url,
    notes,
    status
  ) VALUES (
    p_group_id,
    p_scheduled_at,
    trim(p_field_name),
    p_modality,
    auth.uid(),
    p_field_maps_url,
    trim(p_notes),
    'scheduled'
  ) RETURNING id INTO v_event_id;

  -- Insert notifications for approved players (linked to users)
  INSERT INTO public.notifications (
    user_id,
    type,
    payload
  )
  SELECT
    p.user_id,
    'event_created'::public.notification_type,
    jsonb_build_object(
      'event_id', v_event_id,
      'group_id', p_group_id,
      'field_name', p_field_name,
      'scheduled_at', p_scheduled_at
    )
  FROM public.players p
  WHERE p.group_id = p_group_id
    AND p.stats_status = 'approved'
    AND p.user_id IS NOT NULL
    AND p.archived_at is null;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to update an event and notify if time or location changed
CREATE OR REPLACE FUNCTION public.update_event(
  p_event_id UUID,
  p_modality public.modality DEFAULT NULL,
  p_field_name TEXT DEFAULT NULL,
  p_field_maps_url TEXT DEFAULT NULL,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_group_id UUID;
  v_old_scheduled_at TIMESTAMPTZ;
  v_old_field_name TEXT;
  v_old_modality public.modality;
  v_old_field_maps_url TEXT;
  v_old_notes TEXT;
  v_event_rescheduled BOOLEAN := FALSE;
  v_event_updated BOOLEAN := FALSE;
BEGIN
  -- Check if exists and get old values
  SELECT
    group_id,
    scheduled_at,
    field_name,
    modality,
    field_maps_url,
    notes
  INTO
    v_group_id,
    v_old_scheduled_at,
    v_old_field_name,
    v_old_modality,
    v_old_field_maps_url,
    v_old_notes
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Check permissions (only group owner/admin can update events)
  IF NOT (public.is_group_admin(v_group_id) OR public.is_group_owner(v_group_id)) THEN
    RAISE EXCEPTION 'Unauthorized: Only group owners or admins can update events.';
  END IF;

  -- Date validations if p_scheduled_at is provided
  IF p_scheduled_at IS NOT NULL THEN
    IF p_scheduled_at < now() + interval '1 hour' THEN
      RAISE EXCEPTION 'Scheduled time must be at least 1 hour in the future.';
    END IF;
    IF p_scheduled_at > now() + interval '90 days' THEN
      RAISE EXCEPTION 'Scheduled time cannot be more than 90 days in the future.';
    END IF;
  END IF;

  -- Determine if event_rescheduled notification is needed
  IF (p_scheduled_at IS NOT NULL AND p_scheduled_at IS DISTINCT FROM v_old_scheduled_at) OR
     (p_field_name IS NOT NULL AND trim(p_field_name) IS DISTINCT FROM v_old_field_name) THEN
    v_event_rescheduled := TRUE;
  END IF;

  -- Determine if event_updated notification is needed (for other changes without push)
  IF (p_field_maps_url IS NOT NULL AND p_field_maps_url IS DISTINCT FROM v_old_field_maps_url) OR
     (p_notes IS NOT NULL AND trim(p_notes) IS DISTINCT FROM v_old_notes) OR
     (p_modality IS NOT NULL AND p_modality IS DISTINCT FROM v_old_modality) THEN
    v_event_updated := TRUE;
  END IF;

  -- Update event fields only if provided
  UPDATE public.events SET
    scheduled_at = COALESCE(p_scheduled_at, v_old_scheduled_at),
    field_name = COALESCE(trim(p_field_name), v_old_field_name),
    modality = COALESCE(p_modality, v_old_modality),
    field_maps_url = COALESCE(p_field_maps_url, v_old_field_maps_url),
    notes = COALESCE(trim(p_notes), v_old_notes)
  WHERE id = p_event_id;

  -- Insert notifications
  IF v_event_rescheduled THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      payload
    )
    SELECT
      p.user_id,
      'event_rescheduled'::public.notification_type,
      jsonb_build_object(
        'event_id', p_event_id,
        'group_id', v_group_id,
        'field_name', COALESCE(trim(p_field_name), v_old_field_name),
        'scheduled_at', COALESCE(p_scheduled_at, v_old_scheduled_at),
        'old_field_name', v_old_field_name,
        'old_scheduled_at', v_old_scheduled_at
      )
    FROM public.players p
    WHERE p.group_id = v_group_id
      AND p.stats_status = 'approved'
      AND p.user_id IS NOT NULL
      AND p.archived_at is null;
  ELSIF v_event_updated THEN
    -- Only send event_updated if not sending event_rescheduled
    INSERT INTO public.notifications (
      user_id,
      type,
      payload
    )
    SELECT
      p.user_id,
      'event_updated'::public.notification_type,
      jsonb_build_object(
        'event_id', p_event_id,
        'group_id', v_group_id,
        'field_name', COALESCE(trim(p_field_name), v_old_field_name),
        'scheduled_at', COALESCE(p_scheduled_at, v_old_scheduled_at)
      )
    FROM public.players p
    WHERE p.group_id = v_group_id
      AND p.stats_status = 'approved'
      AND p.user_id IS NOT NULL
      AND p.archived_at is null;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to cancel an event and notify
CREATE OR REPLACE FUNCTION public.cancel_event(
  p_event_id UUID,
  p_motive TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_group_id UUID;
  v_field_name TEXT;
  v_scheduled_at TIMESTAMPTZ;
BEGIN
  SELECT group_id, field_name, scheduled_at
  INTO v_group_id, v_field_name, v_scheduled_at
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  UPDATE public.events SET
    status = 'cancelled'
  WHERE id = p_event_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    payload
  )
  SELECT
    p.user_id,
    'event_cancelled'::public.notification_type,
    jsonb_build_object(
      'event_id', p_event_id,
      'group_id', v_group_id,
      'field_name', v_field_name,
      'scheduled_at', v_scheduled_at
    )
  FROM public.players p
  WHERE p.group_id = v_group_id
    AND p.stats_status = 'approved'
    AND p.user_id IS NOT NULL
    AND p.is_phantom = false
    AND p.is_expelled = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar RLS en la tabla 'events'
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Política para que solo los miembros del grupo puedan ver el evento
CREATE POLICY "Group members can view events"
ON public.events FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.players
    WHERE group_id = events.group_id
      AND user_id = auth.uid()
      AND stats_status = 'approved'
  )
);

-- Política para que solo Admin o Owner puedan actualizar o soft-cancelar un evento
CREATE POLICY "Admin or Owner can update and soft-cancel events"
ON public.events FOR UPDATE
USING (
  public.is_group_admin(group_id) OR public.is_group_owner(group_id)
);
