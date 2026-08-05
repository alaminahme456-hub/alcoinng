-- ============================================================
-- Migration: Remove Supabase Auth dependency
-- Profiles now store email and password_hash directly.
-- No more dependency on auth.users table.
-- ============================================================

-- Step 1: Drop ALL RLS policies first (they reference auth.uid() / auth.role())
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Step 2: Disable RLS on all tables
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activation_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deposit_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop the FK constraint from profiles.id → auth.users(id)
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'f'
    AND confrelid = 'auth.users'::regclass;
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

-- Step 4: Add email column (nullable first, add UNIQUE after filling data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Step 5: Add password_hash column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- Step 6: Set email to NOT NULL with default (safe because existing rows get '')
ALTER TABLE public.profiles ALTER COLUMN email SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

-- Step 7: Add UNIQUE constraint on email (exclude empty strings from uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles (email)
  WHERE email != '';

-- Step 8: Set password_hash to NOT NULL with default
ALTER TABLE public.profiles ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN password_hash SET NOT NULL;

-- Step 9: Add default UUID generation for profiles.id (new users won't come from auth.users)
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();