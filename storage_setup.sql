-- 1. Crear el 'Bucket' (Carpeta) para documentos
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- 2. Permitir ver los archivos (Lectura pública para ver los recibos)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'documents' );

-- 3. Permitir subir archivos (Para registrar los pagos)
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'documents' );
