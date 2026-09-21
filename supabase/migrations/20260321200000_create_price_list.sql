-- Create price_list table
CREATE TABLE IF NOT EXISTS public.price_list (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    category text NOT NULL DEFAULT 'Altro',
    price numeric(10, 2) NOT NULL DEFAULT 0.00,
    price_detail text DEFAULT 'a persona',
    duration text,
    description text,
    requirements text,
    notes text,
    order_index integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid REFERENCES public.users(auth_id) ON DELETE SET NULL,
    updated_by_name text
);

-- Enable Row Level Security
ALTER TABLE public.price_list ENABLE ROW LEVEL SECURITY;

-- 1. Read access for all authenticated users (instructors, helpers, reserves, members)
CREATE POLICY "Enable read access for authenticated users on price_list"
ON public.price_list FOR SELECT
TO authenticated
USING (true);

-- 2. Insert policy for instructors, managers and admins
CREATE POLICY "Enable insert for instructors and admins on price_list"
ON public.price_list FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_id = auth.uid()
        AND (role IN ('ISTRUTTORE', 'MANAGER') OR is_admin = true)
    )
);

-- 3. Update policy for instructors, managers and admins
CREATE POLICY "Enable update for instructors and admins on price_list"
ON public.price_list FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_id = auth.uid()
        AND (role IN ('ISTRUTTORE', 'MANAGER') OR is_admin = true)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_id = auth.uid()
        AND (role IN ('ISTRUTTORE', 'MANAGER') OR is_admin = true)
    )
);

-- 4. Delete policy for instructors, managers and admins
CREATE POLICY "Enable delete for instructors and admins on price_list"
ON public.price_list FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_id = auth.uid()
        AND (role IN ('ISTRUTTORE', 'MANAGER') OR is_admin = true)
    )
);
