-- Enable admins to manage all availabilities
CREATE POLICY "admin_all_availabilities" ON public.availabilities
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() AND is_admin = true
  )
);
