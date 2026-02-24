-- Add columns to store Google Calendar provider tokens
ALTER TABLE public.users
ADD COLUMN google_provider_token text,
ADD COLUMN google_refresh_token text;
