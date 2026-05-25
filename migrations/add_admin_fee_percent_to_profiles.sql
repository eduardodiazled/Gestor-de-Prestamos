-- Add admin_fee_percent column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_fee_percent numeric DEFAULT 40;

-- Set Jhonger Davila to have 50% admin fee
UPDATE public.profiles SET admin_fee_percent = 50 WHERE id = '477e4c55-88f5-44c3-bcdc-38fa68508a1a';
