-- จุดวิ่งประจำ: รันใน SQL Editor ของ Supabase (รันซ้ำได้)
-- แต่ละคนบันทึกจุดที่ไปวิ่งบ่อยไว้ เอาไว้เลือกตอนสร้างคำชวน หรือส่งลิงก์ให้เพื่อน

create table if not exists public.spots (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references public.profiles on delete cascade,
  name        text not null,
  area        text not null default '',
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now()
);
create index if not exists spots_owner_idx on public.spots (owner, created_at desc);

alter table public.spots enable row level security;

-- ของใครของมัน — การส่งให้เพื่อนใช้ลิงก์ที่ฝังพิกัดไว้ ไม่ต้องอ่านตารางของคนอื่น
drop policy if exists spots_select on public.spots;
create policy spots_select on public.spots for select using (owner = auth.uid());
drop policy if exists spots_insert on public.spots;
create policy spots_insert on public.spots for insert with check (owner = auth.uid());
drop policy if exists spots_update on public.spots;
create policy spots_update on public.spots for update using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists spots_delete on public.spots;
create policy spots_delete on public.spots for delete using (owner = auth.uid());
