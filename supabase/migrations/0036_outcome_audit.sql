-- Harness C3 (Fable5-Agentic-Harness-Plan.md): outcome-audit history.
--
-- Each nightly pass records the Spearman correlation between a gate's QC
-- score and the videos' actual outcomes (views, and retention when Analytics
-- OAuth is present). A collapsing correlation is the anti-reward-hacking
-- signal — it means the judge stopped predicting what the audience does.

create table if not exists outcome_audits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  gate text not null,
  metric text not null,             -- 'views' | 'retention'
  correlation double precision not null,
  n int not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists outcome_audits_project_idx on outcome_audits (project_id, created_at desc);

alter table outcome_audits enable row level security;
do $$ begin
  create policy authenticated_full_access on outcome_audits
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
