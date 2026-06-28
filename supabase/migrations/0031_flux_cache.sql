-- Tier 2: per-project FLUX still cache. An identical (prompt, quality) is
-- generated once per project and reused, so re-runs / revisions of unchanged
-- beats cost $0 — mirrors vo_cache (0005) for narration.
create table if not exists flux_cache (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  cache_key text not null,
  quality text not null default 'schnell',
  storage_path text not null,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, cache_key)
);

alter table flux_cache enable row level security;
do $$ begin
  create policy authenticated_full_access on flux_cache
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy service_role_full_access on flux_cache
    for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
