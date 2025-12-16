-- 1. Drop existing policy to fix the "already exists" error
drop policy if exists "Public Access" on storage.objects;

-- 2. Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do update set public = true;

-- 3. Create the permissive policy afresh
create policy "Public Access"
  on storage.objects for all
  using ( bucket_id = 'documents' )
  with check ( bucket_id = 'documents' );
