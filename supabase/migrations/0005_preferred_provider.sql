-- Paste this into the Supabase SQL Editor (Dashboard → SQL Editor → New query)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_provider text NOT NULL DEFAULT 'anthropic'
  CHECK (preferred_provider IN ('anthropic', 'google'));
