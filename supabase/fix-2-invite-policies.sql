-- ============================================================
--  แพตช์ที่ 2 — รันต่อจาก fix-invite-recursion.sql
--  แก้สองเรื่องที่พบตอนทดสอบคำชวนวิ่งและกลุ่มกับผู้ใช้จริงสองบัญชี
-- ============================================================

-- (1) ผู้ถูกชวนมองไม่เห็นว่าใครตอบรับบ้าง เห็นแค่คำตอบของตัวเอง
--     ทำให้หัวข้อ "ใครไปบ้าง" ว่างเปล่า และเจ้าภาพขึ้นเป็น "รอตอบ" ทั้งที่ไปแน่นอน
--     ใครที่เห็นคำชวนได้ ย่อมควรเห็นคำตอบของคนอื่นในนัดนั้นด้วย
drop policy if exists invite_replies_select on public.invite_replies;
create policy invite_replies_select on public.invite_replies for select
  using (member = auth.uid() or public.can_see_invite(invite_id));

-- (2) policy ของ groups/invites เรียกฟังก์ชันที่เป็น stable ซึ่งต้องอ่านตารางตัวเอง
--     ระหว่างสเตตเมนต์ INSERT ... RETURNING ฟังก์ชันยังมองไม่เห็นแถวที่เพิ่งใส่
--     (ใช้ snapshot ตั้งแต่ต้นสเตตเมนต์) Postgres จึงปฏิเสธด้วย
--     "new row violates row-level security policy"
--     เพิ่มการเช็คคอลัมน์ตรง ๆ ไว้หน้าสุด เจ้าของจึงอ่านแถวของตัวเองได้เสมอ
--     และเร็วขึ้นด้วยเพราะไม่ต้องเรียกฟังก์ชันในกรณีที่พบบ่อยที่สุด
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select
  using (owner = auth.uid() or public.in_group(id));

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select
  using (host = auth.uid() or public.can_see_invite(id));
