-- ============================================================
--  Wanna Run? — โครงฐานข้อมูลบน Supabase
--  รันไฟล์นี้ทั้งไฟล์ใน Supabase Dashboard → SQL Editor → New query
--  รันซ้ำได้ (idempotent)
-- ============================================================

-- ---------- ตาราง ----------

-- โปรไฟล์นักวิ่ง หนึ่งแถวต่อหนึ่งบัญชี
create table if not exists public.profiles (
  id                uuid primary key references auth.users on delete cascade,
  name              text not null,
  emoji             text not null default '🏃',
  code              text not null unique,
  bio               text not null default '',
  weekly_goal_km    int  not null default 20,
  total_km          numeric not null default 0,
  avg_pace_sec      int,
  sharing_location  boolean not null default false,
  last_active_at    timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- คำขอเป็นเพื่อน / ความเป็นเพื่อน (แถวเดียวต่อหนึ่งคู่)
create table if not exists public.friendships (
  id          uuid primary key default gen_random_uuid(),
  requester   uuid not null references public.profiles on delete cascade,
  addressee   uuid not null references public.profiles on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  constraint friendship_not_self check (requester <> addressee),
  constraint friendship_unique_pair unique (requester, addressee)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee, status);
create index if not exists friendships_requester_idx on public.friendships (requester, status);

-- กลุ่มวิ่ง
create table if not exists public.groups (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null references public.profiles on delete cascade,
  name         text not null,
  emoji        text not null default '👥',
  description  text not null default '',
  created_at   timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups on delete cascade,
  member    uuid not null references public.profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, member)
);

-- คำชวนวิ่ง
create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  host        uuid not null references public.profiles on delete cascade,
  title       text not null,
  note        text not null default '',
  place_name  text not null,
  place_area  text not null default '',
  lat         double precision not null,
  lng         double precision not null,
  start_at    timestamptz not null,
  target_km   numeric not null,
  group_id    uuid references public.groups on delete set null,
  status      text not null default 'open' check (status in ('open', 'cancelled', 'done')),
  created_at  timestamptz not null default now()
);
create index if not exists invites_host_idx on public.invites (host, start_at);

-- ผู้ถูกชวน + คำตอบ (แถวจะถูกสร้างตอนส่งคำชวน โดย reply เป็น null = ยังไม่ตอบ)
create table if not exists public.invite_replies (
  invite_id  uuid not null references public.invites on delete cascade,
  member     uuid not null references public.profiles on delete cascade,
  reply      text check (reply in ('going', 'maybe', 'declined')),
  replied_at timestamptz,
  primary key (invite_id, member)
);
create index if not exists invite_replies_member_idx on public.invite_replies (member);

-- ตำแหน่งสด หนึ่งแถวต่อหนึ่งคน อัปเดตทับไปเรื่อย ๆ
create table if not exists public.locations (
  user_id     uuid primary key references public.profiles on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  speed_kmh   numeric,
  updated_at  timestamptz not null default now()
);

-- ---------- ฟังก์ชันช่วย ----------
-- security definer เพื่อให้อ่าน friendships ได้โดยไม่ติด RLS ของตัวเอง (กัน policy วนซ้ำ)

create or replace function public.is_connected(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where (f.requester = auth.uid() and f.addressee = other)
       or (f.addressee = auth.uid() and f.requester = other)
  );
$$;

create or replace function public.is_friend(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = auth.uid() and f.addressee = other)
        or (f.addressee = auth.uid() and f.requester = other))
  );
$$;

create or replace function public.in_group(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.groups g where g.id = gid and g.owner = auth.uid())
      or exists (select 1 from public.group_members m where m.group_id = gid and m.member = auth.uid());
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.groups g where g.id = gid and g.owner = auth.uid());
$$;

-- คำชวนวิ่ง: ต้องใช้ security definer เพราะ policy ของ invites กับ invite_replies
-- อ้างถึงกันไปกลับ ถ้าปล่อยให้ผ่าน RLS ปกติ Postgres จะฟ้อง infinite recursion
create or replace function public.is_invite_host(inv uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.invites i where i.id = inv and i.host = auth.uid());
$$;

create or replace function public.can_see_invite(inv uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.invites i where i.id = inv and i.host = auth.uid())
      or exists (select 1 from public.invite_replies r where r.invite_id = inv and r.member = auth.uid())
      or exists (
        select 1 from public.invites i
        where i.id = inv and i.group_id is not null and public.in_group(i.group_id)
      );
$$;

-- สุ่มรหัสเพื่อน RUN-XXXX โดยตัดอักษรที่สับสนง่าย (I O 0 1) ออก
create or replace function public.gen_friend_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := 'RUN-' ||
      substr(alphabet, 1 + floor(random() * 32)::int, 1) ||
      substr(alphabet, 1 + floor(random() * 32)::int, 1) ||
      substr(alphabet, 1 + floor(random() * 32)::int, 1) ||
      substr(alphabet, 1 + floor(random() * 32)::int, 1);
    exit when not exists (select 1 from public.profiles p where p.code = candidate);
  end loop;
  return candidate;
end;
$$;

-- สร้างโปรไฟล์ให้ผู้ใช้ที่เพิ่งสมัคร พร้อมรหัสเพื่อนที่ไม่ซ้ำใคร
create or replace function public.create_my_profile(p_name text, p_emoji text, p_goal_km int)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  insert into public.profiles (id, name, emoji, weekly_goal_km, code)
  values (auth.uid(), coalesce(nullif(trim(p_name), ''), 'นักวิ่งนิรนาม'),
          coalesce(p_emoji, '🏃'), coalesce(p_goal_km, 20), public.gen_friend_code())
  on conflict (id) do update
    set name = excluded.name, emoji = excluded.emoji, weekly_goal_km = excluded.weekly_goal_km
  returning * into row;

  return row;
end;
$$;

-- ส่งคำขอเป็นเพื่อนด้วยรหัส — ต้องผ่านฟังก์ชันนี้เพราะผู้ใช้อ่านโปรไฟล์คนแปลกหน้าตรง ๆ ไม่ได้
create or replace function public.send_friend_request(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  existing public.friendships;
begin
  if auth.uid() is null then
    return 'ต้องเข้าสู่ระบบก่อน';
  end if;

  select id into target from public.profiles where code = upper(trim(p_code));
  if target is null then
    return 'ไม่พบรหัสนี้ ลองเช็กตัวอักษรอีกครั้ง';
  end if;
  if target = auth.uid() then
    return 'นี่คือรหัสของคุณเอง 😄';
  end if;

  select * into existing from public.friendships f
  where (f.requester = auth.uid() and f.addressee = target)
     or (f.addressee = auth.uid() and f.requester = target);

  if existing.id is not null then
    if existing.status = 'accepted' then
      return 'เป็นเพื่อนกันอยู่แล้ว';
    end if;
    -- อีกฝ่ายเคยส่งคำขอมาก่อน ถือว่าตอบรับเลย
    if existing.addressee = auth.uid() then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'เป็นเพื่อนกันแล้ว';
    end if;
    return 'ส่งคำขอไปแล้ว รอตอบรับอยู่';
  end if;

  insert into public.friendships (requester, addressee) values (auth.uid(), target);
  return 'ส่งคำขอเป็นเพื่อนแล้ว';
end;
$$;

-- ---------- Row Level Security ----------

alter table public.profiles       enable row level security;
alter table public.friendships    enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.invites        enable row level security;
alter table public.invite_replies enable row level security;
alter table public.locations      enable row level security;

-- profiles: เห็นตัวเอง และคนที่มีความสัมพันธ์กัน (เพื่อน หรือมีคำขอค้างอยู่)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_connected(id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

-- friendships: เห็นและจัดการเฉพาะคู่ที่ตัวเองเกี่ยวข้อง
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select
  using (requester = auth.uid() or addressee = auth.uid());

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships for insert
  with check (requester = auth.uid());

-- ตอบรับได้เฉพาะฝ่ายที่ถูกขอ
drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships for update
  using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete
  using (requester = auth.uid() or addressee = auth.uid());

-- groups: เจ้าของแก้ได้ สมาชิกเห็นได้
drop policy if exists groups_select on public.groups;
-- เช็คคอลัมน์ตรง ๆ ก่อนเรียกฟังก์ชัน: เร็วกว่า และเจ้าของยังอ่านแถวของตัวเองได้
-- แม้ในสเตตเมนต์ INSERT ... RETURNING ที่ฟังก์ชัน stable ยังมองไม่เห็นแถวใหม่
create policy groups_select on public.groups for select
  using (owner = auth.uid() or public.in_group(id));

drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups for insert with check (owner = auth.uid());

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update
  using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete using (owner = auth.uid());

-- group_members: สมาชิกเห็นรายชื่อกันได้ เจ้าของเพิ่ม/ลบได้ และทุกคนออกเองได้
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select using (public.in_group(group_id));

drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members for insert
  with check (public.is_group_owner(group_id));

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete
  using (member = auth.uid() or public.is_group_owner(group_id));

-- invites: เจ้าภาพจัดการได้ ผู้ถูกชวนและสมาชิกกลุ่มเห็นได้
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select
  using (host = auth.uid() or public.can_see_invite(id));

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert with check (host = auth.uid());

drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites for update
  using (host = auth.uid()) with check (host = auth.uid());

drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites for delete using (host = auth.uid());

-- invite_replies: เจ้าภาพเห็นทุกคำตอบ แต่ละคนแก้ได้เฉพาะคำตอบตัวเอง
drop policy if exists invite_replies_select on public.invite_replies;
-- ใครที่เห็นคำชวนได้ ย่อมเห็นได้ด้วยว่าใครตอบรับบ้าง ไม่ใช่เห็นแค่คำตอบของตัวเอง
create policy invite_replies_select on public.invite_replies for select
  using (member = auth.uid() or public.can_see_invite(invite_id));

drop policy if exists invite_replies_insert on public.invite_replies;
create policy invite_replies_insert on public.invite_replies for insert
  with check (public.is_invite_host(invite_id));

drop policy if exists invite_replies_update on public.invite_replies;
create policy invite_replies_update on public.invite_replies for update
  using (member = auth.uid()) with check (member = auth.uid());

-- locations: อัปเดตของตัวเองได้ และเห็นของเพื่อนเฉพาะตอนเขาเปิดแชร์
drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations for select
  using (user_id = auth.uid()
      or (public.is_friend(user_id)
          and exists (select 1 from public.profiles p
                      where p.id = user_id and p.sharing_location)));

drop policy if exists locations_upsert on public.locations;
create policy locations_upsert on public.locations for insert with check (user_id = auth.uid());

drop policy if exists locations_update on public.locations;
create policy locations_update on public.locations for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists locations_delete on public.locations;
create policy locations_delete on public.locations for delete using (user_id = auth.uid());

-- ---------- Realtime ----------
-- ให้แอปรับการเปลี่ยนแปลงแบบสดผ่าน websocket

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['locations', 'friendships', 'invites', 'invite_replies', 'profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ให้ realtime ส่งค่าเดิมมาด้วยตอนแถวถูกลบ/แก้ (จำเป็นสำหรับ filter ฝั่ง client)
alter table public.locations replica identity full;
