-- Canonical stage artifacts + resumable checkpoints (Batch 2:
-- list2 #1/#3/#4/C10, list1 #26).

-- Fine-grained, PERSISTED progress inside a multi-asset stage so a crashed
-- render resumes at "18 of 30" instead of restarting (C10 / #4). Powers the
-- Backlot board's live tiles with real resumability underneath.
alter table videos
  add column if not exists partial_progress jsonb;

-- Resumable cost snapshot on a build run: the decision + cost state captured so
-- a failed run resumes cleanly rather than re-spending (list1 #26).
alter table build_runs
  add column if not exists cost_snapshot jsonb;

-- One canonical, schema-validated JSON artifact per stage per video
-- (brief -> script -> scene_plan -> asset_manifest -> edit_decisions ->
-- render_report). Append-or-upsert by (video_id, kind).
create table if not exists stage_artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  kind text not null,
  status text not null default 'completed',
  data jsonb not null default '{}',
  valid boolean not null default true,
  errors jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (video_id, kind)
);

create index if not exists stage_artifacts_video_idx on stage_artifacts (video_id);

alter table stage_artifacts enable row level security;
do $$ begin
  create policy "stage_artifacts service" on stage_artifacts for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "stage_artifacts read" on stage_artifacts for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table stage_artifacts;
exception when duplicate_object then null; end $$;
