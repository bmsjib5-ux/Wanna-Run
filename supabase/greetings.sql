-- ============================================================
-- ทักทายเพื่อนด้วยอิโมจิ — รันไฟล์นี้ใน Supabase SQL Editor ครั้งเดียว
-- (รันซ้ำได้ ไม่พัง)
-- ============================================================

create table if not exists public.greetings (
  id          uuid primary key default gen_random_uuid(),
  sender      uuid not null references public.profiles on delete cascade,
  receiver    uuid not null references public.profiles on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  constraint greeting_not_self check (sender <> receiver),
  -- อิโมจิตัวเดียว (บางตัวยาวหลายไบต์ เช่น ธง หรือแบบมีสีผิว) กันไม่ให้ยัดข้อความยาวมา
  constraint greeting_emoji_len check (char_length(emoji) between 1 and 16)
);

-- ดึง "ที่ทักมาหาเราล่าสุด" เป็นการใช้งานหลัก
create index if not exists greetings_receiver_idx on public.greetings (receiver, created_at desc);

alter table public.greetings enable row level security;

-- ส่งได้เฉพาะในนามตัวเอง และเฉพาะถึงเพื่อนที่รับคำขอแล้ว
drop policy if exists greetings_send on public.greetings;
create policy greetings_send on public.greetings for insert
  with check (auth.uid() = sender and public.is_friend(receiver));

-- เห็นได้เฉพาะคู่สนทนา
drop policy if exists greetings_read on public.greetings;
create policy greetings_read on public.greetings for select
  using (auth.uid() = sender or auth.uid() = receiver);

drop policy if exists greetings_delete on public.greetings;
create policy greetings_delete on public.greetings for delete
  using (auth.uid() = sender or auth.uid() = receiver);

-- กันสแปม: ไม่เกิน 10 ครั้งต่อนาทีต่อคน บังคับที่ฐานข้อมูล
-- (ฝั่งแอปมีหน่วงปุ่มอยู่แล้ว แต่ไคลเอนต์ที่ถูกดัดแปลงจะข้ามได้ ตรงนี้ข้ามไม่ได้)
create or replace function public.check_greeting_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.greetings
    where sender = new.sender and created_at > now() - interval '1 minute'
  ) >= 10 then
    raise exception 'ทักบ่อยเกินไป พักสักครู่แล้วลองใหม่นะ';
  end if;
  return new;
end;
$$;

drop trigger if exists greetings_rate_limit on public.greetings;
create trigger greetings_rate_limit
  before insert on public.greetings
  for each row execute function public.check_greeting_rate();

-- ส่งถึงปลายทางแบบสดผ่าน websocket
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'greetings'
  ) then
    alter publication supabase_realtime add table public.greetings;
  end if;
end $$;

comment on table public.greetings is 'ทักทายด้วยอิโมจิระหว่างเพื่อน — เก็บไว้ดูย้อนหลังได้ ลบทิ้งเมื่อไรก็ได้';
