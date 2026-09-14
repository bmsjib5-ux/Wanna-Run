-- ============================================================
-- แจ้งเตือนแบบ push — เก็บ token ของอุปกรณ์ที่ผู้ใช้อนุญาตไว้
-- รันไฟล์นี้ใน Supabase SQL Editor ครั้งเดียว
-- ============================================================

create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  platform    text not null check (platform in ('android', 'ios', 'web')),
  -- android/ios: FCM registration token · web: endpoint ของเบราว์เซอร์
  token       text not null unique,
  -- เฉพาะ web push (RFC 8291) ใช้เข้ารหัสเนื้อหาแจ้งเตือน
  p256dh      text,
  auth        text,
  device      text not null default '',
  updated_at  timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- เจ้าของเท่านั้นที่ยุ่งกับ token ของตัวเองได้
-- (Edge Function อ่านด้วย service role จึงข้าม RLS ไปเอง)
drop policy if exists push_tokens_own_select on public.push_tokens;
create policy push_tokens_own_select on public.push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists push_tokens_own_insert on public.push_tokens;
create policy push_tokens_own_insert on public.push_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists push_tokens_own_update on public.push_tokens;
create policy push_tokens_own_update on public.push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists push_tokens_own_delete on public.push_tokens;
create policy push_tokens_own_delete on public.push_tokens
  for delete using (auth.uid() = user_id);

-- token เดิมอาจถูกย้ายไปอีกบัญชี (ใช้เครื่องเดียวกันคนละคน) จึงอัปเดตทับได้
comment on table public.push_tokens is 'อุปกรณ์ที่รับแจ้งเตือนได้ของแต่ละผู้ใช้ — ลบอัตโนมัติเมื่อผู้ใช้ถูกลบ';
