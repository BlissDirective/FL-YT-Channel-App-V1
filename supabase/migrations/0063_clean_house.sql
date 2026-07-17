-- Clean House Phase 2: triage + execution orchestrator
-- (Clean-House-Build-Spec.md §2/§3).

-- One row per sweep. Mirrors build_runs; enables audit + resume + pause.
create table if not exists clean_house_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  status text not null default 'planning',
    -- planning | awaiting_approval | running | paused | done | cancelled
  scope jsonb not null default '{}',            -- { mode:"all"|"selected", videoIds:[] }
  budget_ceiling_usd numeric not null default 0,
  est_cost_usd numeric not null default 0,
  spent_usd numeric not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Per-asset plan + outcome for a run (powers the live board + final report).
create table if not exists clean_house_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references clean_house_runs(id) on delete cascade,
  video_id uuid not null references videos(id) on delete cascade,
  salvageability numeric not null default 0,       -- 0..1
  verdict text not null default 'advance',          -- advance | flag | skip
  est_cost_usd numeric not null default 0,
  actions jsonb not null default '[]',              -- steps to advance
  outcome text,                                     -- null | ready | flagged | skipped
  spent_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (run_id, video_id)
);

create index if not exists clean_house_runs_project_idx on clean_house_runs (project_id, created_at desc);
create index if not exists clean_house_items_run_idx on clean_house_items (run_id);

-- Clean House flags an asset it deems unfixable (red border + manual only).
alter table videos
  add column if not exists flagged_unfixable boolean not null default false,
  add column if not exists flag_reason text;

alter table clean_house_runs enable row level security;
alter table clean_house_items enable row level security;
do $$ begin
  create policy "ch_runs service" on clean_house_runs for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "ch_runs read" on clean_house_runs for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "ch_items service" on clean_house_items for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "ch_items read" on clean_house_items for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table clean_house_runs;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table clean_house_items;
exception when duplicate_object then null; end $$;
