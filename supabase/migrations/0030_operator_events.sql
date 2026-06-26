-- Auto Pilot Operator (Phase F). A lightweight activity log so an autonomous run
-- is observable: what it seeded, held, approved, when it pulled analytics, sent a
-- digest, rolled the budget cycle, or hit an error. Surfaced on the project
-- homepage and useful for debugging. See docs/Auto-Pilot-Operator-build-plan.md.

create table if not exists operator_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  operator_run_id uuid references operator_runs(id) on delete set null,
  -- seed | hold | notify | approve | skip | auto_approve | analytics | digest
  -- | cycle_roll | budget | error | start | pause | stop
  kind text not null,
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operator_events_project_idx on operator_events (project_id, created_at desc);
create index if not exists operator_events_run_idx on operator_events (operator_run_id, created_at desc);

alter table operator_events enable row level security;
do $$ begin
  create policy authenticated_full_access on operator_events
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
