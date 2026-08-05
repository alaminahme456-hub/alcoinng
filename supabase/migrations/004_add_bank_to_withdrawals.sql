-- Add bank details columns to withdrawals table
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS bank_account_name text;

-- RLS policy for service_role (bypasses RLS, but add for completeness)
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access withdrawals" ON withdrawals
  FOR ALL USING (true) WITH CHECK (true);
