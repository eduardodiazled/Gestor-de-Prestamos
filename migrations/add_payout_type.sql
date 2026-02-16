-- Add type column to investor_payouts to distinguish between payouts and reinvestments
ALTER TABLE investor_payouts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'payout';

-- Verify
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'investor_payouts' AND column_name = 'type';
