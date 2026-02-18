-- Add fund_source column to investor_payouts
-- fund_source will be either 'earnings' or 'capital'
-- Default to 'earnings' for existing records (mostly interested based payouts)

ALTER TABLE public.investor_payouts ADD COLUMN IF NOT EXISTS fund_source TEXT DEFAULT 'earnings' CHECK (fund_source IN ('earnings', 'capital'));

-- Update existing reinvestment records to be considered 'earnings' source by default
UPDATE public.investor_payouts SET fund_source = 'earnings' WHERE type = 'reinvestment';
