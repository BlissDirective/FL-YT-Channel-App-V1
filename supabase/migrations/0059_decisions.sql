-- Decision audit trail (#9) + regenerable-asset provenance (C2).
--
-- One append-only row per creative/technical CHOICE the studio makes for a
-- video — the model/provider it picked, the voice, the music, the style, a
-- fallback it took — each logged with the ALTERNATIVES it weighed, a CONFIDENCE,
-- the REASONING, the cost, and the exact request PARAMS needed to reproduce the
-- resulting asset (C2). Generalises the Director-only `operator_decisions` into
-- a per-video/per-beat log every mode writes to, and builds on the
-- `clip_jobs.selection` model-score log from #1.
create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  -- Per-beat decisions (model/still) carry the beat; video-level ones (voice,
  -- music, tier) leave it null.
  beat_idx int,
  -- What KIND of choice: model | provider | medium | tier | voice | music |
  -- style | fallback | regenerate | …  (free text — new kinds never need a
  -- migration).
  kind text not null,
  -- The option chosen (label or id).
  choice text not null,
  -- The runners-up considered: [{ id, label, score?, costUsd? }, …].
  alternatives jsonb not null default '[]',
  -- 0..1 confidence in the pick (e.g. the winner's normalised score).
  confidence numeric,
  -- Human-readable why-this-won.
  reasoning text,
  cost_usd numeric,
  -- Exact request needed to reproduce the asset (C2): prompt, model, endpoint,
  -- seed, duration, aspect, provider params, source asset id, …
  params jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists decisions_video_created_idx on decisions (video_id, created_at desc);
create index if not exists decisions_project_created_idx on decisions (project_id, created_at desc);

alter table decisions enable row level security;

do $$ begin
  create policy "decisions service" on decisions for all to service_role using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "decisions read" on decisions for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Stream to the live board / decision panel as choices are made.
do $$ begin
  alter publication supabase_realtime add table decisions;
exception when duplicate_object then null; end $$;
