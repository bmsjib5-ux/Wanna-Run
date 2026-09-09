-- ============================================================
--  รูปโปรไฟล์ — รันไฟล์นี้เพิ่มจาก schema.sql
--  รันซ้ำได้
-- ============================================================

-- คอลัมน์เก็บที่อยู่รูป (null = ใช้อวตารอิโมจิเหมือนเดิม)
alter table public.profiles add column if not exists avatar_url text;

-- ถังเก็บไฟล์แบบอ่านได้สาธารณะ เพราะรูปโปรไฟล์ถูกแสดงผ่าน <img> ตรง ๆ
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- ไฟล์เก็บที่ <user id>/avatar.jpg แต่ละคนจึงเขียนได้เฉพาะโฟลเดอร์ของตัวเอง
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
