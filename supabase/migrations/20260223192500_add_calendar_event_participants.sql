-- Create a new table to link users to calendar events
CREATE TABLE IF NOT EXISTS public.calendar_event_participants (
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (event_id, user_id)
);

-- RLS for calendar_event_participants
ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vedi tutti i partecipanti_events" 
  ON public.calendar_event_participants 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin può inserire partecipanti_events"
  ON public.calendar_event_participants
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admin può eliminare partecipanti_events"
  ON public.calendar_event_participants
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_id = auth.uid() AND users.is_admin = true
    )
  );
