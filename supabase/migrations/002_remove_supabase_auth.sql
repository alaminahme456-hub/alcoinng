-- ============================================================
-- Migration: Remove Supabase Auth dependency
-- Profiles now store email and password_hash directly.
-- No more dependency on auth.users table.
-- ============================================================

-- Step 1: Add email and password_hash columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT UNIQUE NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Step 2: Disable RLS on all tables (service role key bypasses RLS, and we don't use Supabase Auth anymore)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop all RLS policies (they reference auth.uid() and auth.role() which are Supabase Auth functions)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Step 4: Drop the foreign key constraint from profiles.id to auth.users(id)
-- and replace it with a self-generating UUID primary key
DO $$
BEGIN
  -- Drop FK to auth.users if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'profiles'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%auth%' OR constraint_name LIKE '%users%'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- Step 5: Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
