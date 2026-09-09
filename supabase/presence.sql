-- สถานะออนไลน์ที่แม่นขึ้น: รันใน SQL Editor ของ Supabase (รันซ้ำได้)
--
-- 1) is_online: แอปตั้ง true ตอนเปิดอยู่ และ false ทันทีตอนถูกย่อ/ปิด
--    (ก่อนหน้านี้ดูจากเวลาอย่างเดียว จึงยังขึ้นออนไลน์ค้างอีก 2 นาทีหลังปิดแอป)
-- 2) touch_presence(): ประทับเวลาด้วยนาฬิกาของเซิร์ฟเวอร์ และคืนเวลานั้นให้แอป
--    เพื่อเทียบนาฬิกา — มือถือที่ตั้งเวลาคลาดกันหลายนาทีจะไม่ทำให้สถานะเพี้ยนอีก

alter table public.profiles
  add column if not exists is_online boolean not null default false;

create or replace function public.touch_presence(p_online boolean default true)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set last_active_at = now(),
         is_online      = p_online
   where id = auth.uid()
  returning now();
$$;

revoke all on function public.touch_presence(boolean) from public;
grant execute on function public.touch_presence(boolean) to authenticated;
