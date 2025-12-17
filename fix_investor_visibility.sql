-- FIX: PERMITIR A SOCIAS VER NOMBRES DE CLIENTES
-- Ejecuta esto en Supabase SQL Editor

-- 1. Modificar política de Clientes para que Socias puedan ver nombres de clientes QUE TIENEN préstamos con ellas
drop policy if exists "Inversionistas ven sus clientes" on public.clients;

create policy "Inversionistas ven sus clientes" on public.clients
for select using (
  exists (
    select 1 from public.loans
    where loans.client_id = clients.id
    and loans.investor_id = auth.uid()
  )
);

-- 2. Asegurar que las Socias puedan ver sus propios perfiles (para el nombre en el header)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
for select using (auth.uid() = id);

-- 3. Asegurar que Admin vea todo
drop policy if exists "Admin full access profiles" on public.profiles;
create policy "Admin full access profiles" on public.profiles
for all using (
  exists (select 1, role from public.profiles where id = auth.uid() and role = 'admin')
);
