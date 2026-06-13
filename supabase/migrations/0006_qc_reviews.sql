-- QC agent: automatic gate reviews (idea #5) — score + issues per arrival,
-- and the basis for real Co-pilot auto-approval.
create table if not exists qc_reviews (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  gate text not null,
  score numeric not null,
  verdict text not null,
  issues jsonb not null default '[]',
  strengths jsonb not null default '[]',
  auto_approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table qc_reviews enable row level security;
do $$ begin
  create policy authenticated_full_access on qc_reviews
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy service_role_full_access on qc_reviews
    for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;
