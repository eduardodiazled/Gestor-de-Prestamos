-- Actualizar el nombre del Administrador
UPDATE public.profiles
SET full_name = 'CEO Luis Eduardo Diaz'
WHERE role = 'admin' OR email = 'luchodiaz11@hotmail.com'; -- Asegurando que le pegue a tu usuario
