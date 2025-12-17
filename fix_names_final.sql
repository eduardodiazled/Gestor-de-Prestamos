-- FIX FINAL: NOMBRES Y REDIRECCIÓN
-- Ejecuta esto para corregir los nombres feos (emails) y forzar el rol de socia.

-- 1. CORREGIR NOMBRES Y ROLES
-- Cambia 'mariangelica@socia.com' por el correo real que usaste
UPDATE public.profiles
SET full_name = 'Mariangelica', role = 'investor'
WHERE email ILIKE '%mariangelica%';

-- Cambia 'herminia@socia.com' por el correo real
UPDATE public.profiles
SET full_name = 'Herminia', role = 'investor'
WHERE email ILIKE '%herminia%';

-- 2. ASEGURAR QUE LOS PERMISOS (RLS) ESTÉN BIEN (OBLIGATORIO)
-- Esto permite que el sistema "vea" el rol y haga la redirección
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
for select using (auth.uid() = id);

-- 3. PERMITIR VER NOMBRES DE CLIENTES
drop policy if exists "Inversionistas ven sus clientes" on public.clients;
create policy "Inversionistas ven sus clientes" on public.clients
for select using (
  exists (
    select 1 from public.loans
    where loans.client_id = clients.id
    and loans.investor_id = auth.uid()
  )
);
