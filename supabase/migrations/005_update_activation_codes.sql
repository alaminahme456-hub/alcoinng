-- ============================================================
-- Migration 005: Update activation_codes for ALC### format
-- ============================================================

-- Add 'type' column if not exists (activation, deposit, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activation_codes' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.activation_codes ADD COLUMN type TEXT NOT NULL DEFAULT 'activation';
  END IF;
END $$;

-- Rename 'value' to 'activation_value' for clarity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activation_codes' AND column_name = 'value'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activation_codes' AND column_name = 'activation_value'
  ) THEN
    ALTER TABLE public.activation_codes RENAME COLUMN value TO activation_value;
  END IF;
END $$;

-- Clean up old codes that don't match ALC### format
DELETE FROM public.activation_codes WHERE code !~ '^ALC[0-9]{3}$';

-- Add a CHECK constraint ensuring code format is ALC + 3 digits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activation_codes_code_format'
  ) THEN
    ALTER TABLE public.activation_codes
      ADD CONSTRAINT activation_codes_code_format
      CHECK (code ~ '^ALC[0-9]{3}$');
  END IF;
END $$;

-- Ensure unique constraint on code (should already exist but enforce)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'activation_codes_code_key'
  ) THEN
    ALTER TABLE public.activation_codes ADD UNIQUE (code);
  END IF;
END $$;

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON public.activation_codes(status);

-- Add index on code for lookups
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.activation_codes(code);
