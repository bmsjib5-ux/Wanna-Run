-- ============================================================
-- รูปแบนเนอร์ของคำชวนวิ่ง — รันไฟล์นี้ใน Supabase SQL Editor ครั้งเดียว
-- (รันซ้ำได้ ไม่พัง)
-- ============================================================

-- null = ใช้ภาพพื้นหลังมาตรฐานเหมือนเดิม
alter table public.invites add column if not exists banner_url text;

-- ถังเก็บไฟล์แบบอ่านได้สาธารณะ เพราะรูปถูกแสดงผ่าน <img> ตรง ๆ
-- จำกัด 3 MB ต่อไฟล์ (แอปย่อเหลือ ~150 KB อยู่แล้ว เผื่อไว้กันพลาด)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invite-banners', 'invite-banners', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- ไฟล์เก็บที่ <user id>/<invite id>.jpg แต่ละคนจึงเขียนได้เฉพาะโฟลเดอร์ของตัวเอง
drop policy if exists invite_banners_read on storage.objects;
create policy invite_banners_read on storage.objects for select
  using (bucket_id = 'invite-banners');

drop policy if exists invite_banners_insert on storage.objects;
create policy invite_banners_insert on storage.objects for insert
  with check (bucket_id = 'invite-banners' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists invite_banners_update on storage.objects;
create policy invite_banners_update on storage.objects for update
  using (bucket_id = 'invite-banners' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'invite-banners' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists invite_banners_delete on storage.objects;
create policy invite_banners_delete on storage.objects for delete
  using (bucket_id = 'invite-banners' and (storage.foldername(name))[1] = auth.uid()::text);
