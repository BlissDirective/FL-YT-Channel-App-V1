-- Visual Craft Engine V3 — per-beat refine loop audit (§2.4).
--
-- beat_refine_runs — one row per targeted refine attempt: the critic's specific
-- complaint, the prompt before/after the rewrite, the score movement, medium,
-- and cost. Makes the cheap-first refine loop observable and its lessons mineable.
create table if not exists beat_refine_runs (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  beat_idx int not null,
  attempt int not null,
  from_score numeric,
  to_score numeric,
  critic_note text,
  prompt_before text,
  prompt_after text,
  medium text,
  cost_usd numeric,
  created_at timestamptz not null default now()
);
create index if not exists beat_refine_runs_video_idx on beat_refine_runs (video_id, beat_idx);

alter table beat_refine_runs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'beat_refine_runs' and policyname = 'authenticated_full_access') then
    create policy authenticated_full_access on beat_refine_runs for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'beat_refine_runs' and policyname = 'service_role_full_access') then
    create policy service_role_full_access on beat_refine_runs for all to service_role using (true) with check (true);
  end if;
end $$;
