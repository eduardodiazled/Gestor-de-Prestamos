-- DIAGNOSTICO COMPLETO
SELECT 'Prestamos (Loans)' as tabla, count(*) as cantidad FROM public.loans
UNION ALL
SELECT 'Clientes (Clients)', count(*) FROM public.clients
UNION ALL
SELECT 'Perfiles (Socias)', count(*) FROM public.profiles;
