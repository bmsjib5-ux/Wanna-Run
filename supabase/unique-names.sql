-- ============================================================
--  บังคับให้ชื่อนักวิ่งไม่ซ้ำกัน
--  รันเพิ่มจาก schema.sql
--
--  ⚠️ ถ้ามีชื่อซ้ำอยู่แล้วในฐานข้อมูล การสร้าง index จะล้มเหลว
--     ให้รันคำสั่งนี้ก่อนเพื่อดูว่ามีใครซ้ำบ้าง แล้วแก้ชื่อหรือลบบัญชีทิ้ง:
--
--       select lower(name) as ชื่อ, count(*) as จำนวน, array_agg(id) as บัญชี
--       from public.profiles group by lower(name) having count(*) > 1;
-- ============================================================

-- เทียบแบบไม่สนตัวพิมพ์ใหญ่เล็ก "Peajip" กับ "peajip" ถือว่าซ้ำกัน
create unique index if not exists profiles_name_lower_key
  on public.profiles (lower(name));

-- ให้แอปเช็คชื่อว่างไหมได้ ทั้งที่อ่านตาราง profiles ของคนอื่นตรง ๆ ไม่ได้
-- (คืน true เมื่อใช้ได้ และไม่นับชื่อเดิมของตัวเองว่าซ้ำ)
create or replace function public.is_name_available(p_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select btrim(coalesce(p_name, '')) <> '' and not exists (
    select 1 from public.profiles p
    where lower(p.name) = lower(btrim(p_name))
      and p.id is distinct from auth.uid()
  );
$$;

-- ตอนสร้างโปรไฟล์ ถ้าชื่อชนกันให้ตอบเป็นข้อความที่ผู้ใช้อ่านรู้เรื่อง
create or replace function public.create_my_profile(p_name text, p_emoji text, p_goal_km int)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
  clean text := coalesce(nullif(btrim(p_name), ''), 'นักวิ่งนิรนาม');
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  if exists (
    select 1 from public.profiles p
    where lower(p.name) = lower(clean) and p.id is distinct from auth.uid()
  ) then
    raise exception 'ชื่อ "%" มีคนใช้แล้ว ลองตั้งชื่ออื่นดูนะ', clean
      using errcode = 'unique_violation';
  end if;

  insert into public.profiles (id, name, emoji, weekly_goal_km, code)
  values (auth.uid(), clean, coalesce(p_emoji, '🏃'), coalesce(p_goal_km, 20), public.gen_friend_code())
  on conflict (id) do update
    set name = excluded.name, emoji = excluded.emoji, weekly_goal_km = excluded.weekly_goal_km
  returning * into row;

  return row;
end;
$$;
