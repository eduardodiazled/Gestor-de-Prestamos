-- Create the 'documents' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

-- Allow public access to 'documents' bucket (Upload, Select, etc)
-- First, disable RLS on objects to make it easiest for this protoype
-- OR add a permissive policy
create policy "Public Access"
  on storage.objects for all
  using ( bucket_id = 'documents' )
  with check ( bucket_id = 'documents' );
