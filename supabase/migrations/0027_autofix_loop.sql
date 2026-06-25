-- Auto-Fix Loop (self-improving vision optimizer).
-- Two pluggable strategies selected per channel:
--   • 'animation' — Remotion/stick: tunes pose/timing/framing/captions, re-rolls beats.
--   • 'aiclip'    — AI image/clip: re-rolls/swaps visuals, reframes, fixes VO/captions,
--                   may rewrite a script beat when the script is the root cause.
-- The loop critiques the rendered output (Tier-1 Claude vision; Tier-2 TwelveLabs on
-- motion/timing escalation), applies one fix, re-renders, and re-critiques — up to a
-- bounded number of re-renders — then holds for manual review. Every attempt is
-- recorded so the per-project memory (playbook + param priors + anti-patterns)
-- compounds and quality improves over time.

-- ── Per-project configuration + memory ────────────────────────────────
alter table projects
  -- which strategy runs for this channel: 'off' | 'animation' | 'aiclip'
  add column if not exists autofix_loop text not null default 'off',
  -- master on/off for the automatic loop on this channel
  add column if not exists autofix_enabled boolean not null default false,
  -- { threshold, maxRenders, spendCapUsd }
  add column if not exists autofix_config jsonb not null
    default '{"threshold":7,"maxRenders":2,"spendCapUsd":1.0}'::jsonb,
  -- per-project learned memory: { playbook[], priors{}, antiPatterns[], stats{}, updatedAt }
  add column if not exists autofix_memory jsonb not null default '{}'::jsonb;

-- ── Per-video override + loop run-state ───────────────────────────────
alter table videos
  -- null = inherit the project setting; true/false = force on/off for this asset
  add column if not exists autofix_enabled boolean,
  -- loop state machine for this video: { status, attempts, bestScore, lastScore,
  -- actedOnAt, spentUsd, loop, history[] }
  add column if not exists autofix_state jsonb not null default '{}'::jsonb;

-- ── Audit trail: one row per fix attempt ──────────────────────────────
create table if not exists autofix_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  video_id uuid not null references videos(id) on delete cascade,
  loop text not null,                       -- 'animation' | 'aiclip'
  attempt int not null,                     -- 1-based re-render attempt
  tier text not null default 'tier1',       -- 'tier1' (Claude) | 'tier2' (TwelveLabs)
  from_score numeric,                       -- score that triggered the fix
  to_score numeric,                         -- score after the re-render (null until re-critiqued)
  changes jsonb not null default '[]'::jsonb,  -- human-readable list of edits applied
  cost_usd numeric not null default 0,
  status text not null default 'applied',   -- 'applied' | 'improved' | 'regressed' | 'held' | 'error'
  note text,
  created_at timestamptz not null default now()
);

create index if not exists autofix_runs_video_idx on autofix_runs (video_id, created_at desc);
create index if not exists autofix_runs_project_idx on autofix_runs (project_id, created_at desc);

alter table autofix_runs enable row level security;
do $$ begin
  create policy authenticated_full_access on autofix_runs
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
