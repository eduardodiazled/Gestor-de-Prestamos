-- Add column for ID photo to clients table
alter table public.clients 
add column if not exists id_photo_url text;
