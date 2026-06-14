-- Phase A — Video / Market Intelligence: stored blueprint scans.
-- A scan analyzes similar videos (Data-API metadata + optional pasted
-- transcript) and stores Claude's structured blueprint. Synchronous in
-- Phase A; `status` is kept for the async worker lanes (Phase C).

create table if not exists video_intel (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  video_id uuid references videos(id) on delete set null,
  topic text not null default '',
  competitors jsonb not null default '[]',     -- [{videoId,title,channelTitle,views,url,publishedAt}]
  transcript text,                             -- optional operator-pasted transcript
  blueprint jsonb not null default '{}',       -- {works[],doesnt[],hooks[],structure[],pacing[],gaps[],titlePatterns[],thumbnailPatterns[],angle}
  status text not null default 'done',         -- queued | running | done | error (async lanes)
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists video_intel_project_idx
  on video_intel (project_id, created_at desc);

alter table video_intel enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'video_intel' and policyname = 'authenticated_full_access'
  ) then
    create policy authenticated_full_access on video_intel
      for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$ begin
  alter publication supabase_realtime add table video_intel;
exception when duplicate_object then null; end $$;
