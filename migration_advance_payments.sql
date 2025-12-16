-- Add paid_until column to track advance payments
alter table public.loans 
add column if not exists paid_until date;

-- Initialize paid_until based on start_date for existing loans (assuming they just started)
update public.loans 
set paid_until = start_date 
where paid_until is null;
