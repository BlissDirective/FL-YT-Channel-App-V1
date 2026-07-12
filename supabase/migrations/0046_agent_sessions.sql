-- MVDA Phase C (review pass 3, C1–C3): the agent handoff + audit trail.
--
-- videos.edit_session_requested — conflict #2's handoff flag: when a
-- MVDA-enabled project's clips finish, maybeFinish parks the video at
-- ASSETS_READY and raises this instead of advancing to ASSEMBLING; the agent
-- worker claims it (CAS on the flag), runs the cut session, and mark_ready
-- lands the video at the CUT gate.
--
-- projects.mvda_enabled — per-channel opt-in to the agent cut (the Director
-- envelope rides this in Phase E).
-- projects.cut_copilot_floor — C2: the CUT gate's copilot auto-approve floor
-- (operator-decided 7.0; deliberately distinct from the app-wide 7.5).
--
-- agent_sessions — one row per agent run: bounded turns/spend, the judge's
-- final verdict, and the version range it produced. Append-only audit.

alter table videos
  add column if not exists edit_session_requested boolean not null default false;

alter table projects
  add column if not exists mvda_enabled boolean not null default false;
alter table projects
  add column if not exists cut_copilot_floor numeric not null default 7.0;

create table if not exists agent_sessions (
  id               uuid primary key default gen_random_uuid(),
  video_id         uuid not null references videos(id) on delete cascade,
  project_id       uuid not null,
  status           text not null default 'running'
                     check (status in ('running','ready','held','failed')),
  turns            int not null default 0,
  spend_usd        numeric not null default 0,
  max_budget_usd   numeric not null default 0.8,
  model            text not null default '',
  edd_version_start int,
  edd_version_end   int,
  judge            jsonb not null default '{}'::jsonb,
  note             text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists agent_sessions_video_idx
  on agent_sessions (video_id, created_at desc);

alter table agent_sessions enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'agent_sessions' and policyname = 'authenticated_full_access'
  ) then
    create policy authenticated_full_access on agent_sessions
      for all to authenticated using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'agent_sessions' and policyname = 'service_role_full_access'
  ) then
    create policy service_role_full_access on agent_sessions
      for all to service_role using (true) with check (true);
  end if;
end $$;
