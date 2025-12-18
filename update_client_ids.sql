-- Actualizar Cédulas de Clientes (Bulk Update)

-- Julio Diaz
UPDATE public.clients 
SET document_id = '12568212' 
WHERE full_name ILIKE '%Julio%Diaz%';

-- Carlos Vanegas
UPDATE public.clients 
SET document_id = '77185350' 
WHERE full_name ILIKE '%Carlos%Vanegas%';

-- Jhonger
UPDATE public.clients 
SET document_id = '1064110005' 
WHERE full_name ILIKE '%Jhonger%';

-- Ludys
UPDATE public.clients 
SET document_id = '36573871' 
WHERE full_name ILIKE '%Ludys%';

-- Jener
UPDATE public.clients 
SET document_id = '12524560' 
WHERE full_name ILIKE '%Jener%' OR full_name ILIKE '%JENER%';

-- Eleixer (Probablemente "Eleixer Beleño" u otro apellido)
UPDATE public.clients 
SET document_id = '1062806798' 
WHERE full_name ILIKE '%Eleixer%' OR full_name ILIKE '%Elixir%';
