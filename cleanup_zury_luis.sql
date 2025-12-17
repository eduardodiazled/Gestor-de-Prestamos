-- SCRIPT DE LIMPIEZA
-- Ejecuta esto en el "SQL Editor" de Supabase para borrar los datos de prueba.

BEGIN;

---------------------------------------------------
-- 1. BORRAR TODO LO RELACIONADO CON "ZURY"
---------------------------------------------------

-- Borrar Pagos del préstamo de Zury
DELETE FROM public.payments
WHERE loan_id IN (
    SELECT l.id FROM public.loans l
    JOIN public.clients c ON l.client_id = c.id
    WHERE c.full_name ILIKE '%zury%'
);

-- Borrar Préstamos de Zury
DELETE FROM public.loans
WHERE client_id IN (
    SELECT id FROM public.clients
    WHERE full_name ILIKE '%zury%'
);

-- Borrar Cliente Zury
DELETE FROM public.clients
WHERE full_name ILIKE '%zury%';

---------------------------------------------------
-- 2. BORRAR EL SOCIO "LUIS DIAZ"
---------------------------------------------------

-- Borrar Pagos de la socia Luis Diaz (si tuviera)
DELETE FROM public.investor_payouts
WHERE investor_id IN (
    SELECT id FROM public.profiles
    WHERE full_name ILIKE '%luis diaz%'
);

-- Borrar Préstamos donde Luis Diaz es el inversionista
-- Primero borramos los pagos de esos préstamos
DELETE FROM public.payments
WHERE loan_id IN (
    SELECT id FROM public.loans
    WHERE investor_id IN (
        SELECT id FROM public.profiles WHERE full_name ILIKE '%luis diaz%'
    )
);

-- Ahora sí borramos los préstamos
DELETE FROM public.loans
WHERE investor_id IN (
    SELECT id FROM public.profiles
    WHERE full_name ILIKE '%luis diaz%'
);

-- Finalmente borramos el perfil publico
DELETE FROM public.profiles
WHERE full_name ILIKE '%luis diaz%';

COMMIT;

-- NOTA FINAL:
-- Este script borra los DATOS, pero el usuario de Login (Email) seguirá existiendo.
-- Para borrar el Login, ve a Authentication -> Users y bórralo manualmente.
