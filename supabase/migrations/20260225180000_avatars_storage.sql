-- Enable storage if not already enabled (usually is by default in Supabase)
-- We will create a bucket named 'avatars' for user profile pictures.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB limit
    array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS for Avatars Bucket
-- Note: Supabase Storage uses the `storage.objects` table.

-- Policy: chiunque può leggere gli avatar (public bucket support)
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: gli utenti autenticati possono caricare i propri avatar
-- Richiediamo che il file inizi con il loro ID utente per evitare sovrascritture altrui: auth.uid()
CREATE POLICY "Users can upload their own avatar."
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- Policy: gli utenti autenticati possono modificare i propri avatar
CREATE POLICY "Users can update their own avatar."
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- Policy: gli utenti autenticati possono cancellare i propri avatar
CREATE POLICY "Users can delete their own avatar."
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (auth.uid())::text = (string_to_array(name, '/'))[1]
);
