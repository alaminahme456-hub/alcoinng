-- ============================================================
-- Migration 006: Trade lifecycle - active trades with exact expiration
-- ============================================================

-- Add new columns to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

-- Add entry_price and exit_price (aliases for start_price/end_price for clarity)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS entry_price NUMERIC(18,4);
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS exit_price NUMERIC(18,4);

-- Change status constraint: active / won / lost (instead of just win/loss in result)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'won'
  CHECK (status IN ('active', 'won', 'lost'));

-- Backfill: set status from result for existing trades
UPDATE public.trades SET status = COALESCE(result, 'lost') WHERE status = 'won' AND result IS NOT NULL;
UPDATE public.trades SET status = 'lost' WHERE result = 'loss' AND status = 'won';

-- Backfill: set started_at/expires_at from created_at + duration for existing trades
UPDATE public.trades
SET
  started_at = created_at,
  expires_at = created_at + (duration || ' seconds')::INTERVAL,
  entry_price = start_price,
  exit_price = end_price
WHERE started_at IS NULL;

-- Add indexes for active trade lookups
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_expires_at ON public.trades(expires_at);
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON public.trades(user_id, status);

-- Add constraint: one active trade per user at a time
-- (We enforce this at app level too, but a partial unique index is safest)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_one_active_per_user
  ON public.trades(user_id) WHERE status = 'active';
