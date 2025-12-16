create table public.investor_payouts (
  id uuid default uuid_generate_v4() primary key,
  investor_id uuid references public.profiles(id) not null,
  amount numeric not null,
  date date not null default date(now()),
  notes text,
  proof_url text, -- Para subir comprobante de la transferencia a la socia
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.investor_payouts enable row level security;

create policy "Admin full access payouts" on public.investor_payouts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Also add a view or policy for investors to see their OWN payouts later
create policy "Investors see own payouts" on public.investor_payouts
  for select using (
    auth.uid() = investor_id
  );
