-- Director Mode — D1 foundation (Fable-5-Director-Mode-Build-Spec.md §3).
--
-- projects.pipeline_mode — per-project orchestration mode. 'autonomous' (the
-- default) is today's behavior: the engine advances videos, sweeps/crons act,
-- gates auto-resolve per the per-gate `autonomy` settings. 'director' hands
-- every transition to the operator: the engine never self-advances a director
-- project, all autonomous sweeps skip it, QC floors become advisory (annotate,
-- never block), and revision caps/auto-approve are disabled. Money rails
-- (budget caps, fail-closed spend guard, kill switch) stay enforced in BOTH
-- modes. Flipping modes is safe at any time (freeze-in-place / re-arm; §4.2).
--
-- projects.director_micro_loops — when a director project runs a stage, the
-- agent still executes in-stage quality micro-loops (seed re-roll, variety
-- re-roll) inside the single button press (§4.4). Default on; the operator can
-- disable for absolute single-shot control. Ignored in autonomous mode.
--
-- videos.length_target — Director length brackets (§4.5): the format + exact
-- bracket chosen at idea time. Shape:
--   { "format": "short"|"long", "bracket": "60-90s", "minSec": 60, "maxSec": 90 }
-- Nullable — autonomous videos keep their tier/target_len behavior. When
-- present it wins over tier defaults in scripting + VO assembly.
--
-- operator_decisions — the Director decision ledger (§3.3 / §7). One append-
-- only row per operator action (generate/review/revise/rerender/advance/
-- step_back/publish/kill), capturing the agent's score/verdict at decision
-- time so disagreement mining can calibrate judges to operator taste. RLS
-- mirrors agent_sessions (authenticated + service_role full access).

alter table projects
  add column if not exists pipeline_mode text not null default 'autonomous'
    check (pipeline_mode in ('autonomous', 'director'));

alter table projects
  add column if not exists director_micro_loops boolean not null default true;

alter table videos
  add column if not exists length_target jsonb;

create table if not exists operator_decisions (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects(id) on delete cascade,
  video_id          uuid references videos(id) on delete cascade,
  stage             text not null
                      check (stage in ('idea','script','visuals','edit','publish')),
  action            text not null
                      check (action in ('generate','review','revise','rerender',
                                        'advance','step_back','publish','kill')),
  agent_score       numeric,
  agent_verdict     text check (agent_verdict is null or agent_verdict in ('pass','fail')),
  operator_notes    text,
  findings_applied  jsonb,
  cost_usd          numeric,
  created_at        timestamptz not null default now()
);

create index if not exists operator_decisions_project_idx
  on operator_decisions (project_id, created_at desc);
create index if not exists operator_decisions_video_stage_idx
  on operator_decisions (video_id, stage);

alter table operator_decisions enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'operator_decisions' and policyname = 'authenticated_full_access'
  ) then
    create policy authenticated_full_access on operator_decisions
      for all to authenticated using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'operator_decisions' and policyname = 'service_role_full_access'
  ) then
    create policy service_role_full_access on operator_decisions
      for all to service_role using (true) with check (true);
  end if;
end $$;

-- Director projects must never be dragged along by an autonomous sweep. A
-- partial index keeps the "director project" filter that every skip-guard uses
-- cheap even as the projects table grows.
create index if not exists projects_pipeline_mode_idx
  on projects (pipeline_mode) where pipeline_mode = 'director';
