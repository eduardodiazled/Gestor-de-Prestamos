-- Drop table if exists to ensure schema update
drop table if exists public.loan_applications;

-- Create table for storing incomplete loan applications (drafts)
create table public.loan_applications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  step integer default 1,
  data jsonb default '{}'::jsonb, -- Stores form data: client, loan details
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.loan_applications enable row level security;

-- Policies
create policy "Users can manage own drafts"
on public.loan_applications
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Optional: Trigger to update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_loan_applications_modtime
    before update on public.loan_applications
    for each row
    execute procedure update_updated_at_column();
