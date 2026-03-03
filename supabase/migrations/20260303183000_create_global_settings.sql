CREATE TABLE public.global_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enable_week_view boolean NOT NULL DEFAULT false,
  CONSTRAINT global_settings_id_check CHECK (id = 1)
);

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read
CREATE POLICY "Anyone can read global settings" 
  ON public.global_settings
  FOR SELECT 
  USING (true);

-- Allow only admins to update
CREATE POLICY "Admins can update global settings"
  ON public.global_settings
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Insert default row
INSERT INTO public.global_settings (id, enable_week_view) VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
