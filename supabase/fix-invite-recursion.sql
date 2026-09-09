-- ============================================================
--  แพตช์แก้ infinite recursion ของ invites / invite_replies
--  รันไฟล์นี้ถ้าเคยรัน schema.sql เวอร์ชันแรกไปแล้ว
--  (ถ้ารัน schema.sql เวอร์ชันล่าสุดอยู่แล้ว ไม่ต้องรันไฟล์นี้)
-- ============================================================

create or replace function public.is_group_owner(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.groups g where g.id = gid and g.owner = auth.uid());
$$;

create or replace function public.is_invite_host(inv uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.invites i where i.id = inv and i.host = auth.uid());
$$;

create or replace function public.can_see_invite(inv uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.invites i where i.id = inv and i.host = auth.uid())
      or exists (select 1 from public.invite_replies r where r.invite_id = inv and r.member = auth.uid())
      or exists (
        select 1 from public.invites i
        where i.id = inv and i.group_id is not null and public.in_group(i.group_id)
      );
$$;

-- เปลี่ยน policy ให้เรียกฟังก์ชันข้างบนแทนการ subquery ข้ามตารางกันไปมา
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select
  using (public.can_see_invite(id));

drop policy if exists invite_replies_select on public.invite_replies;
create policy invite_replies_select on public.invite_replies for select
  using (member = auth.uid() or public.is_invite_host(invite_id));

drop policy if exists invite_replies_insert on public.invite_replies;
create policy invite_replies_insert on public.invite_replies for insert
  with check (public.is_invite_host(invite_id));

drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members for insert
  with check (public.is_group_owner(group_id));

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete
  using (member = auth.uid() or public.is_group_owner(group_id));
