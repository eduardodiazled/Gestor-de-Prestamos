
-- Insert New Investor
INSERT INTO public.profiles (id, email, full_name, role)
VALUES 
  (uuid_generate_v4(), 'neuvasocia@zaldo.com', 'Nueva Socia', 'investor');
