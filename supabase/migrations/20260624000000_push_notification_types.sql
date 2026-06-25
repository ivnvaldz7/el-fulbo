-- Add new notification types for attendance reminders and MVP voting
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'attendance_reminder';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'mvp_voting_open';

-- Fix: add missing stats_rejected type (exists in TypeScript but missing in DB enum)
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'stats_rejected';
