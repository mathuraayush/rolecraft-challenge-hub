insert into storage.buckets (id, name, public) values ('submissions', 'submissions', true) on conflict (id) do nothing;

create policy "Submissions bucket public read"
on storage.objects for select
using (bucket_id = 'submissions');

create policy "Authenticated can upload to submissions"
on storage.objects for insert
to authenticated
with check (bucket_id = 'submissions' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own submission files"
on storage.objects for update
to authenticated
using (bucket_id = 'submissions' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own submission files"
on storage.objects for delete
to authenticated
using (bucket_id = 'submissions' and auth.uid()::text = (storage.foldername(name))[1]);