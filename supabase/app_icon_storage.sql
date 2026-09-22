insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-branding', 'app-branding', true, 1048576, array['image/png'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public app icon read" on storage.objects;
create policy "Public app icon read"
on storage.objects
for select
using (bucket_id = 'app-branding');

drop policy if exists "Public app icon insert" on storage.objects;
create policy "Public app icon insert"
on storage.objects
for insert
with check (bucket_id = 'app-branding');

drop policy if exists "Public app icon update" on storage.objects;
create policy "Public app icon update"
on storage.objects
for update
using (bucket_id = 'app-branding')
with check (bucket_id = 'app-branding');

drop policy if exists "Public app icon delete" on storage.objects;
create policy "Public app icon delete"
on storage.objects
for delete
using (bucket_id = 'app-branding');
