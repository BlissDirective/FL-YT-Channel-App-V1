-- Phase 0 of Full-Auto Build & Post: the batch "run record" + per-video links.
-- A build_run is one "Build & Post" launch (1–6 videos, one config). Videos
-- created by a run carry build_run_id + auto_pilot_run; scheduling/auto-publish
-- columns are added now but only used by later phases. See
-- docs/Full-Auto-Build-and-Posting-plan.md.

create table if not exists build_runs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  status          text not null default 'generating',  -- planning|generating|scheduled|publishing|done|held|cancelled
  count           int  not null,
  kind            text not null default 'long',          -- long|short (one type per run)
  length_min_sec  int  not null default 60,
  length_max_sec  int  not null default 120,
  tier            text not null default 'economy',       -- base|economy|premium|platinum|custom
  custom_spec     jsonb,
  thumb_style     text not null default 'bold-bottom',   -- bold-bottom|center-punch|top-kicker
  qc_floor        numeric not null default 7.0,
  qc_public       numeric not null default 8.0,
  schedule_mode   text not null default 'all_at_once',   -- all_at_once|multi_day|staggered
  schedule_cfg    jsonb not null default '{}',
  idea_source     text not null default 'existing',      -- existing|research
  est_cost_usd    numeric not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists build_runs_project_idx on build_runs (project_id, created_at desc);

alter table videos
  add column if not exists build_run_id uuid references build_runs(id) on delete set null,
  add column if not exists scheduled_publish_at timestamptz,
  add column if not exists auto_publish boolean not null default false,
  add column if not exists auto_pilot_run boolean not null default false,
  add column if not exists publish_privacy text;             -- public|unlisted (set from final QC)

create index if not exists videos_build_run_idx on videos (build_run_id);
-- Drives the build-runner: pending = a run video still at the IDEA_APPROVED seed.
create index if not exists videos_pending_build_idx
  on videos (status, created_at) where build_run_id is not null;

alter table build_runs enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'build_runs' and policyname = 'authenticated_full_access'
  ) then
    create policy authenticated_full_access on build_runs
      for all to authenticated using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'build_runs' and policyname = 'service_role_full_access'
  ) then
    create policy service_role_full_access on build_runs
      for all to service_role using (true) with check (true);
  end if;
end $$;

do $$ begin
  alter publication supabase_realtime add table build_runs;
exception when duplicate_object then null; end $$;
