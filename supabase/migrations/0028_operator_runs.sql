-- Auto Pilot Operator (Phase A). A per-channel supervisor that runs a project
-- end-to-end: seeds one video/day at a fixed slot under a 30-day budget, drives
-- it through the existing Build & Post pipeline + auto-fix loop, and holds it for
-- approval. See docs/Auto-Pilot-Operator-build-plan.md.

create table if not exists operator_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  -- 'active' = producing · 'paused' = temporarily halted (clock keeps elapsing)
  -- · 'stopped' = ended. Pause/Stop never reset the budget before the cycle rolls.
  status text not null default 'active',
  -- The 30-day budget cycle is anchored to the FIRST start; it rolls forward in
  -- 30-day steps. Spend is summed from cost_ledger since cycle_start (no counter
  -- to drift).
  cycle_start timestamptz not null default now(),
  cycle_budget_usd numeric not null default 60,
  -- Tunables: posting slot, per-format caps + tiers + lengths, mix, daily cap,
  -- auto-approve rule, ramp. { postingHour, postingTz, dailyCap, mixShortsPct,
  -- shortsCapUsd, longCapUsd, shortsTier, longTier, shortLenMin/Max,
  -- longLenMin/Max, autoApproveHours, autoApproveQc, thumbStyle }.
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operator_runs_project_idx on operator_runs (project_id, created_at desc);
-- At most one live (active|paused) operator run per project.
create unique index if not exists operator_runs_live_uq
  on operator_runs (project_id)
  where status in ('active', 'paused');

-- Videos the operator owns. The auto-pilot finalizer defers these (they hold for
-- approval instead of auto-publishing).
alter table videos
  add column if not exists operator_run_id uuid references operator_runs(id) on delete set null;

create index if not exists videos_operator_run_idx on videos (operator_run_id, created_at desc);

alter table operator_runs enable row level security;
do $$ begin
  create policy authenticated_full_access on operator_runs
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
