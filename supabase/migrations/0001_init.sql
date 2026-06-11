-- Faceless Studio — initial schema
-- Applied via .github/workflows/db-migrate.yml (psql runner).

create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────
do $$ begin
  create type video_status as enum (
    'IDEA','IDEA_APPROVED','SCRIPTING','SCRIPT_READY','GENERATING_ASSETS',
    'ASSETS_READY','ASSEMBLING','FINAL_REVIEW','APPROVED','TRACKING',
    'NEEDS_REVISION','KILLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_gate as enum ('IDEA','SCRIPT','ASSETS','FINAL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_kind as enum ('vo','clip','thumb','render','captions','music');
exception when duplicate_object then null; end $$;

-- ── Tables ───────────────────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text not null default '',
  audience text not null default '',
  angle text not null default '',
  tone text not null default 'authoritative',
  brand_kit jsonb not null default '{"primary":"#F5B829","secondary":"#17150F","thumbnailStyle":"cinematic","font":"bold-sans"}',
  voice_id text,
  voice_name text,
  autonomy jsonb not null default '{"IDEA":"assist","SCRIPT":"assist","ASSETS":"assist","FINAL":"assist"}',
  budget jsonb not null default '{"perVideoUsd":15,"monthlyUsd":150}',
  status text not null default 'active',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  angle text not null default '',
  source jsonb not null default '{}',         -- {ytVideoId,url,views,channelSubs,publishedAt}
  score numeric,
  flag text,                                   -- HIGH_VALUE | MEDIUM | SKIP
  status text not null default 'new',          -- new | approved | dismissed
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  idea_id uuid references ideas(id) on delete set null,
  title text not null,
  topic text not null default '',
  status video_status not null default 'IDEA',
  format text not null default 'explainer',    -- list | story | explainer | case_study
  target_length_sec int not null default 480,
  scheduled_at timestamptz,
  youtube_video_id text,
  total_cost_usd numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scripts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  version int not null default 1,
  body text not null default '',
  beats jsonb not null default '[]',           -- [{idx,text,visualPrompt,shotType}]
  runtime_sec int,
  metadata jsonb not null default '{}',        -- {titles[],description,tags[],chapters[]}
  created_at timestamptz not null default now(),
  unique (video_id, version)
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  kind asset_kind not null,
  storage_path text not null default '',
  provider text not null default 'mock',
  beat_index int,
  meta jsonb not null default '{}',
  cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  gate approval_gate not null,
  decision text,                               -- approved | revision | killed
  decided_by text,                             -- human | qc_agent
  notes text,
  wait_token text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists prompt_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null,                          -- script | scoring | thumbnail | metadata
  version int not null default 1,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, kind, version)
);

create table if not exists analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  meta jsonb not null default '{}'
);

create table if not exists cost_ledger (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  video_id uuid references videos(id) on delete set null,
  provider text not null,
  description text not null default '',
  usd numeric not null default 0,
  at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'
);

-- ── Indexes ──────────────────────────────────────────────────────────
create index if not exists videos_project_status_idx on videos (project_id, status);
create index if not exists ideas_project_status_idx on ideas (project_id, status);
create index if not exists assets_video_idx on assets (video_id);
create index if not exists approvals_video_idx on approvals (video_id);
create index if not exists snapshots_video_idx on analytics_snapshots (video_id, captured_at desc);
create index if not exists ledger_project_at_idx on cost_ledger (project_id, at desc);

-- ── updated_at trigger ───────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

do $$ begin
  create trigger projects_updated_at before update on projects
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger videos_updated_at before update on videos
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- ── Row Level Security ───────────────────────────────────────────────
-- Single-operator app: any authenticated user has full access; anon has none.
do $$
declare t text;
begin
  foreach t in array array['projects','ideas','videos','scripts','assets',
    'approvals','prompt_templates','analytics_snapshots','cost_ledger','app_settings']
  loop
    execute format('alter table %I enable row level security', t);
    begin
      execute format(
        'create policy authenticated_full_access on %I for all to authenticated using (true) with check (true)', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- ── Storage bucket for media assets ──────────────────────────────────
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

do $$ begin
  create policy media_authenticated_all on storage.objects
    for all to authenticated
    using (bucket_id = 'media') with check (bucket_id = 'media');
exception when duplicate_object then null; end $$;
