-- Phase 8 — Intelligence & Agents
-- Optimizer insight cards: plain-English findings correlated from tracked
-- stats, each optionally carrying a proposed prompt-template diff the
-- operator applies (and can revert via template versioning) with one tap.

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  kind text not null default 'optimizer',     -- optimizer | scout
  title text not null,
  body text not null default '',
  evidence jsonb not null default '{}',        -- {videos:[...], metric, lift}
  proposed_template_kind text,                 -- script | scoring | thumbnail | metadata
  proposed_template_body text,
  status text not null default 'new',          -- new | applied | dismissed
  applied_template_version int,                -- version created when applied (for revert)
  created_at timestamptz not null default now()
);

create index if not exists insights_project_status_idx
  on insights (project_id, status, created_at desc);

-- RLS: single-operator app — authenticated full access, anon none (matches
-- every other table from 0001).
alter table insights enable row level security;
do $$ begin
  create policy authenticated_full_access on insights
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Insight cards stream onto /insights as the weekly job writes them.
do $$ begin
  alter publication supabase_realtime add table insights;
exception when duplicate_object then null; end $$;
