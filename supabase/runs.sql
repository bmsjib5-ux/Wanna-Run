-- ประวัติการวิ่ง ความคืบหน้า และคะแนนเกม — รันใน SQL Editor ของ Supabase (รันซ้ำได้)
-- ทั้งสามตารางเป็นข้อมูลส่วนตัว: เจ้าของเท่านั้นที่อ่านและแก้ได้
-- (ตัวเลขที่เพื่อนเห็น เช่น ระยะสะสมและเพซเฉลี่ย ยังอยู่บนตาราง profiles เหมือนเดิม)

-- ---------- ประวัติการวิ่ง ----------
create table if not exists public.runs (
  id          uuid primary key,
  owner       uuid not null references public.profiles on delete cascade,
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  distance_m  double precision not null,
  moving_ms   bigint not null,
  -- เส้นทางที่ลดจุดแล้ว (เก็บทุก ~10 เมตร) รูปแบบ [{lat,lng,t}, ...]
  path        jsonb not null default '[]'::jsonb,
  invite_id   text,
  place_name  text,
  simulated   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists runs_owner_idx on public.runs (owner, started_at desc);

alter table public.runs enable row level security;
drop policy if exists runs_select on public.runs;
create policy runs_select on public.runs for select using (owner = auth.uid());
drop policy if exists runs_insert on public.runs;
create policy runs_insert on public.runs for insert with check (owner = auth.uid());
drop policy if exists runs_update on public.runs;
create policy runs_update on public.runs for update using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists runs_delete on public.runs;
create policy runs_delete on public.runs for delete using (owner = auth.uid());

-- ---------- ความคืบหน้า: XP เหรียญ เลเวล ตัวนับภารกิจ ----------
create table if not exists public.progress (
  owner        uuid primary key references public.profiles on delete cascade,
  xp           int not null default 0,
  coins        int not null default 0,
  counters     jsonb not null default '{}'::jsonb,
  -- รหัสภารกิจที่กดรับรางวัลไปแล้ว
  claimed      jsonb not null default '[]'::jsonb,
  last_spin_at timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.progress enable row level security;
drop policy if exists progress_select on public.progress;
create policy progress_select on public.progress for select using (owner = auth.uid());
drop policy if exists progress_upsert on public.progress;
create policy progress_upsert on public.progress for insert with check (owner = auth.uid());
drop policy if exists progress_update on public.progress;
create policy progress_update on public.progress for update using (owner = auth.uid()) with check (owner = auth.uid());

-- ---------- คะแนนสูงสุดของมินิเกม ----------
create table if not exists public.game_scores (
  owner      uuid not null references public.profiles on delete cascade,
  game       text not null,
  best_score int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (owner, game)
);

alter table public.game_scores enable row level security;
drop policy if exists game_scores_select on public.game_scores;
create policy game_scores_select on public.game_scores for select using (owner = auth.uid());
drop policy if exists game_scores_insert on public.game_scores;
create policy game_scores_insert on public.game_scores for insert with check (owner = auth.uid());
drop policy if exists game_scores_update on public.game_scores;
create policy game_scores_update on public.game_scores for update using (owner = auth.uid()) with check (owner = auth.uid());
