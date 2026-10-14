-- ==============================================================================
-- Migration: Enable Row Level Security (RLS) for Security Advisor warnings
-- Tables: public.calendar_events, public.day_notes, public.profile
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: public.calendar_events
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all calendar events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'calendar_events' 
      AND policyname = 'Enable read access for authenticated users on calendar_events'
  ) THEN
    CREATE POLICY "Enable read access for authenticated users on calendar_events"
    ON public.calendar_events FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Allow authenticated users to insert calendar events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'calendar_events' 
      AND policyname = 'Enable insert for authenticated users on calendar_events'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users on calendar_events"
    ON public.calendar_events FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = created_by OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_id = auth.uid() AND (is_admin = true OR role IN ('ISTRUTTORE', 'MANAGER'))
      )
    );
  END IF;
END $$;

-- Allow creators or admins to update calendar events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'calendar_events' 
      AND policyname = 'Enable update for creators or admins on calendar_events'
  ) THEN
    CREATE POLICY "Enable update for creators or admins on calendar_events"
    ON public.calendar_events FOR UPDATE
    TO authenticated
    USING (
      auth.uid() = created_by OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_id = auth.uid() AND (is_admin = true OR role IN ('ISTRUTTORE', 'MANAGER'))
      )
    );
  END IF;
END $$;

-- Allow creators or admins to delete calendar events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'calendar_events' 
      AND policyname = 'Enable delete for creators or admins on calendar_events'
  ) THEN
    CREATE POLICY "Enable delete for creators or admins on calendar_events"
    ON public.calendar_events FOR DELETE
    TO authenticated
    USING (
      auth.uid() = created_by OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_id = auth.uid() AND (is_admin = true OR role IN ('ISTRUTTORE', 'MANAGER'))
      )
    );
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 2. Table: public.day_notes
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.day_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all day notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'day_notes' 
      AND policyname = 'Enable read access for authenticated users on day_notes'
  ) THEN
    CREATE POLICY "Enable read access for authenticated users on day_notes"
    ON public.day_notes FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Allow authenticated users to create day notes with their user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'day_notes' 
      AND policyname = 'Enable insert for authenticated users on day_notes'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users on day_notes"
    ON public.day_notes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow authors or admins to delete day notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'day_notes' 
      AND policyname = 'Enable delete for authors or admins on day_notes'
  ) THEN
    CREATE POLICY "Enable delete for authors or admins on day_notes"
    ON public.day_notes FOR DELETE
    TO authenticated
    USING (
      auth.uid() = user_id OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_id = auth.uid() AND is_admin = true
      )
    );
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. Table: public.profile
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profile ENABLE ROW LEVEL SECURITY;

-- Enable read for authenticated users on profile (if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profile' 
      AND policyname = 'Enable read access for authenticated users on profile'
  ) THEN
    CREATE POLICY "Enable read access for authenticated users on profile"
    ON public.profile FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;
