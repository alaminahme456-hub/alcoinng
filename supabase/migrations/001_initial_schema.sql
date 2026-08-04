-- ============================================================
-- ALCOIN Database Schema for Supabase
-- ============================================================

-- PROFILES table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL DEFAULT '',
  username        TEXT UNIQUE NOT NULL,
  phone           TEXT NOT NULL DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_activated    BOOLEAN NOT NULL DEFAULT false,
  activated_at    TIMESTAMPTZ,
  activation_code_id UUID REFERENCES public.activation_codes(id) ON DELETE SET NULL,
  referred_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code   TEXT UNIQUE NOT NULL,
  profile_picture TEXT,
  bank_name       TEXT,
  bank_account    TEXT,
  bank_account_name TEXT,
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  otp_code        TEXT,
  otp_expires_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WALLETS
CREATE TABLE IF NOT EXISTS public.wallets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('reward', 'deposit', 'profit')),
  balance    NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, type)
);

-- ACTIVATION CODES
CREATE TABLE IF NOT EXISTS public.activation_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT UNIQUE NOT NULL,
  value        NUMERIC(18,2) NOT NULL DEFAULT 5000,
  status       TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'disabled')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_at  TIMESTAMPTZ
);

-- DEPOSIT CODES
CREATE TABLE IF NOT EXISTS public.deposit_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT UNIQUE NOT NULL,
  amount       NUMERIC(18,2) NOT NULL,
  status       TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'disabled')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_at  TIMESTAMPTZ
);

-- ADS
CREATE TABLE IF NOT EXISTS public.ads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  thumbnail  TEXT NOT NULL,
  duration   INTEGER NOT NULL,
  reward     NUMERIC(18,2) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AD VIEWS
CREATE TABLE IF NOT EXISTS public.ad_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_id      UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  completed  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ad_id)
);

-- TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  instructions   TEXT NOT NULL,
  reward         NUMERIC(18,2) NOT NULL,
  requires_proof BOOLEAN NOT NULL DEFAULT false,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TASK SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- TRADES
CREATE TABLE IF NOT EXISTS public.trades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  funding_wallet    TEXT NOT NULL CHECK (funding_wallet IN ('reward', 'deposit', 'profit')),
  prediction        TEXT NOT NULL CHECK (prediction IN ('buy', 'sell')),
  amount            NUMERIC(18,2) NOT NULL,
  payout_multiplier NUMERIC(18,2) NOT NULL,
  duration          INTEGER NOT NULL,
  result            TEXT CHECK (result IN ('win', 'loss')),
  profit            NUMERIC(18,2),
  start_price       NUMERIC(18,4),
  end_price         NUMERIC(18,4),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WITHDRAWALS
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet     TEXT NOT NULL CHECK (wallet IN ('reward', 'deposit', 'profit')),
  amount     NUMERIC(18,2) NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  type       TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  action     TEXT NOT NULL,
  details    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_user_ad ON public.ad_views(user_id, ad_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_task ON public.task_submissions(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- ============================================================
-- RLS POLICIES — Enable RLS on all tables
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON public.profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.wallets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.activation_codes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.deposit_codes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.ads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.ad_views FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.tasks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.task_submissions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.trades FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.withdrawals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.announcements FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.audit_logs FOR ALL USING (auth.role() = 'service_role');

-- Anon users can read public content
CREATE POLICY "Public read ads" ON public.ads FOR SELECT USING (true);
CREATE POLICY "Public read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);

-- Authenticated users can manage their own data
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users read own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users read own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own ad_views" ON public.ad_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ad_views" ON public.ad_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own task_submissions" ON public.task_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own task_submissions" ON public.task_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own audit_logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Profiles insert on signup (handled via trigger)
CREATE POLICY "Allow profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- FUNCTION: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER ads_updated_at BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER task_submissions_updated_at BEFORE UPDATE ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER withdrawals_updated_at BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
