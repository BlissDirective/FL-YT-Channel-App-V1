-- Long-clip jobs (Phase: long clips). Background worker produces a single mp4
-- per section via Veo-3.1 extend or multi-clip auto-stitch, then replaces that
-- section's clip asset. Merges are handled as a storyboard beat-merge first.
create table if not exists clip_jobs (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  beat_idx int not null,
  method text not null,                 -- 'veo-extend' | 'stitch' | 'stitch-seamless'
  model text not null default 'seedance-2-fast',
  target_sec int not null,
  status text not null default 'queued',-- queued | running | done | error
  result_path text,
  cost_usd numeric not null default 0,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists clip_jobs_status_idx on clip_jobs (status, created_at);
create index if not exists clip_jobs_video_idx on clip_jobs (video_id, created_at desc);

alter table clip_jobs enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'clip_jobs' and policyname = 'authenticated_full_access'
  ) then
    create policy authenticated_full_access on clip_jobs
      for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$ begin
  alter publication supabase_realtime add table clip_jobs;
exception when duplicate_object then null; end $$;
