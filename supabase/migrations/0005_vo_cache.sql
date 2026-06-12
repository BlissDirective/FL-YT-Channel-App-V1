-- Phase 5: narration cache — identical text + voice within a project is
-- synthesized once and reused (e.g. the standard outro), making repeats free.
create table if not exists vo_cache (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  voice_id text not null,
  text_hash text not null,
  storage_path text not null,
  duration_sec numeric,
  words jsonb,
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, voice_id, text_hash)
);

alter table vo_cache enable row level security;
do $$ begin
  create policy authenticated_full_access on vo_cache
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy service_role_full_access on vo_cache
    for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
