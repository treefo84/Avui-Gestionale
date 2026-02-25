-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id uuid REFERENCES public.users(auth_id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable read access for authenticated users" 
ON public.announcements FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON public.announcements FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Enable delete for message authors or admins" 
ON public.announcements FOR DELETE 
TO authenticated 
USING (
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND is_admin = true)
);
