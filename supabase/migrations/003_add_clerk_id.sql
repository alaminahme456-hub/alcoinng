-- ============================================================
-- Migration: Add clerk_id column for Clerk auth integration
-- ============================================================

-- Add clerk_id column (nullable — existing profiles from Supabase Auth era won't have one)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'clerk_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN clerk_id TEXT;
  END IF;
END $$;

-- Index for fast Clerk user lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_clerk_id
  ON public.profiles (clerk_id)
  WHERE clerk_id IS NOT NULL;
