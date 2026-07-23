-- ClickMax-transition Phase 1 (Fable5-ClickMax-Transition-Build-Plan §5).
-- Additive only: no existing read path changes semantics.

-- 1-4. Project workspace fields.
alter table projects add column if not exists instructions text;
alter table projects add column if not exists workspace_mode text not null default 'director'
  check (workspace_mode in ('director', 'autopilot'));
alter table projects add column if not exists composer_prefs jsonb not null default '{}'::jsonb;
alter table projects add column if not exists notify_prefs jsonb not null default '{"telegram": true, "webpush": true}'::jsonb;

-- Backfill workspace_mode from the two legacy autonomy configs: a project is
-- 'autopilot' when it wasn't in Director Mode AND any gate ran autopilot.
update projects
set workspace_mode = 'autopilot'
where coalesce(pipeline_mode, 'autonomous') <> 'director'
  and (
    autonomy ->> 'IDEA' = 'autopilot' or autonomy ->> 'SCRIPT' = 'autopilot'
    or autonomy ->> 'ASSETS' = 'autopilot' or autonomy ->> 'FINAL' = 'autopilot'
  );

-- 5-6. Per-asset take history + stale cascade.
create table if not exists asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid,
  video_id uuid not null references videos(id) on delete cascade,
  kind text not null,
  beat_index int,
  provider text,
  storage_path text,
  meta jsonb not null default '{}'::jsonb,
  cost_usd numeric not null default 0,
  archived_at timestamptz not null default now()
);
create index if not exists asset_versions_video_idx on asset_versions (video_id, kind, beat_index);

alter table assets add column if not exists stale boolean not null default false;

-- 7. Asset-scoped QC (gate-scoped rows keep asset_id null).
alter table qc_reviews add column if not exists asset_id uuid;

-- 8. Workspace chat thread — replayable, minable by the learning loop.
create table if not exists workspace_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  role text not null check (role in ('user', 'agent', 'system')),
  content text not null,
  intent jsonb,          -- resolved action name + params (null for plain replies)
  affected_asset_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists workspace_messages_video_idx on workspace_messages (video_id, created_at);
create index if not exists workspace_messages_project_idx on workspace_messages (project_id, created_at);

-- 9. Model rates — one SQL source for estimates/reconciliation; unit_credits
-- stays unused until the v2 credits system (decision 3).
create table if not exists model_rates (
  model_id text primary key,
  kind text not null check (kind in ('video', 'image', 'voice', 'llm')),
  unit text not null,             -- 'sec' | 'image' | '1k-chars' | 'mtok'
  unit_cost_usd numeric not null,
  unit_credits numeric,
  updated_at timestamptz not null default now()
);

insert into model_rates (model_id, kind, unit, unit_cost_usd) values
  ('seedance-2-fast', 'video', 'sec', 0.022),
  ('seedance-2',      'video', 'sec', 0.07),
  ('kling-2-5-turbo', 'video', 'sec', 0.07),
  ('ltx-2',           'video', 'sec', 0.04),
  ('wan-2-2',         'video', 'sec', 0.08),
  ('veo-3-1',         'video', 'sec', 0.4),
  ('veo-3-1-extend',  'video', 'sec', 0.4),
  ('flux-schnell',    'image', 'image', 0.003),
  ('flux-dev',        'image', 'image', 0.025),
  ('elevenlabs',      'voice', '1k-chars', 0.15),
  ('kokoro',          'voice', '1k-chars', 0.02)
on conflict (model_id) do nothing;

-- Single-operator RLS, matching the app's existing policy shape.
alter table asset_versions enable row level security;
alter table workspace_messages enable row level security;
alter table model_rates enable row level security;
drop policy if exists asset_versions_all on asset_versions;
create policy asset_versions_all on asset_versions for all to authenticated using (true) with check (true);
drop policy if exists workspace_messages_all on workspace_messages;
create policy workspace_messages_all on workspace_messages for all to authenticated using (true) with check (true);
drop policy if exists model_rates_read on model_rates;
create policy model_rates_read on model_rates for select to authenticated using (true);
