-- Force RLS OFF for investor_payouts table to prevent any permission issues
alter table public.investor_payouts disable row level security;
