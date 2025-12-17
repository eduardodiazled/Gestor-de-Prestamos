-- SCRIPT PARA VINCULAR/FUSIONAR CUENTAS
-- Úsalo cuando crees un usuario nuevo en Authentication y quieras pasarle los datos de un "Perfil Fantasma" o antiguo.

-- INSTRUCCIONES:
-- 1. Cambia 'correo@nuevo.com' por el correo REAL que acabas de registrar en Authentication.
-- 2. Cambia 'Nombre Fantasma' por el nombre EXACTO tal como aparece hoy en la lista de inversionistas (ej: 'Herminia' o 'Mariangelica').
-- 3. Dale Run.

DO $$
DECLARE
    new_user_id uuid;
    old_profile_id uuid;
    target_email text := 'CORREO_AQUI@GMAIL.COM'; -- <--- PON AQUÍ EL EMAIL REAL
    placeholder_name text := 'NOMBRE_FANTASMA_AQUI'; -- <--- PON AQUÍ EL NOMBRE DEL PERFIL VIEJO
BEGIN
    -- 1. Buscar el ID del Nuevo Usuario Real (desde Authentication)
    SELECT id INTO new_user_id FROM auth.users WHERE email = target_email;

    -- 2. Buscar el ID del Perfil Viejo/Fantasma (por nombre)
    --    (Aseguramos que no sea el mismo usuario nuevo para evitar errores)
    SELECT id INTO old_profile_id FROM public.profiles 
    WHERE full_name ILIKE ('%' || placeholder_name || '%') 
    AND id != new_user_id
    LIMIT 1;

    -- Verificaciones
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró el usuario con email: %. Primero créalo en Auth.', target_email;
    END IF;

    IF old_profile_id IS NULL THEN
        RAISE NOTICE 'No se encontró un perfil antiguo con nombre: %. Quizás ya fue migrado.', placeholder_name;
        RETURN; -- Salir sin hacer nada si no hay nada que migrar
    END IF;

    RAISE NOTICE 'Migrando datos de % (ID: %) a Usuario % (ID: %)', placeholder_name, old_profile_id, target_email, new_user_id;

    -- 3. MIGRAR DATOS
    
    -- A. Mover Préstamos
    UPDATE public.loans
    SET investor_id = new_user_id
    WHERE investor_id = old_profile_id;

    -- B. Mover Pagos a Socias (Payouts)
    UPDATE public.investor_payouts
    SET investor_id = new_user_id
    WHERE investor_id = old_profile_id;

    -- 4. ELIMINAR PERFIL VIEJO (Ya quedó vacío)
    DELETE FROM public.profiles WHERE id = old_profile_id;

    -- 5. Asegurar que el nuevo tenga rol Inversionista
    UPDATE public.profiles SET role = 'investor' WHERE id = new_user_id;

END $$;
