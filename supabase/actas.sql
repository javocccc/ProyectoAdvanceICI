-- Ejecutar en el SQL Editor del proyecto Supabase conectado a Firebase Auth.
-- Firebase Project ID: advanceici.
-- El bucket es privado y solo acepta PDFs de menos de 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('actas', 'actas', false, 10485759, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Supabase verifica el JWT de Firebase antes de evaluar estas políticas.
-- La claim actas la asigna el script functions/scripts/syncSupabaseClaims.mjs
-- a Administradores y Coordinadores activos.
drop policy if exists "actas_direccion_leer" on storage.objects;
drop policy if exists "actas_direccion_subir" on storage.objects;
drop policy if exists "actas_direccion_borrar" on storage.objects;
drop policy if exists "actas_gestores_leer" on storage.objects;
drop policy if exists "actas_gestores_subir" on storage.objects;
drop policy if exists "actas_gestores_borrar" on storage.objects;

create policy "actas_gestores_leer"
on storage.objects for select to authenticated
using (
  bucket_id = 'actas'
  and auth.jwt()->>'actas' = 'true'
  and auth.jwt()->>'iss' = 'https://securetoken.google.com/advanceici'
  and auth.jwt()->>'aud' = 'advanceici'
);

create policy "actas_gestores_subir"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'actas'
  and auth.jwt()->>'actas' = 'true'
  and auth.jwt()->>'iss' = 'https://securetoken.google.com/advanceici'
  and auth.jwt()->>'aud' = 'advanceici'
  and lower(name) like '%.pdf'
);

create policy "actas_gestores_borrar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'actas'
  and auth.jwt()->>'actas' = 'true'
  and auth.jwt()->>'iss' = 'https://securetoken.google.com/advanceici'
  and auth.jwt()->>'aud' = 'advanceici'
);
