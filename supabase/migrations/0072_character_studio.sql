-- Character Studio, Phase 1 (docs/Character-Studio-Build-Plan.md).
-- Characters and art styles become first-class objects instead of prose in
-- projects.instructions. Additive only: a project with no characters and no
-- styles behaves exactly as before.

-- ── Characters: GLOBAL (account-level), style-INDEPENDENT identity ──────────
-- A character's description works in any style; only its images are
-- style-specific (see character_looks). That split is what lets one cast be
-- rendered in two styles without duplicating the cast.
create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Alias forms the name-matcher also accepts ("Bo", "Bo the boy").
  aliases text[] not null default '{}',
  -- 'location' is deliberate: a location is a character that never moves, and
  -- recurring settings are the second-largest source of visual drift.
  role text not null default 'cast'
    check (role in ('presenter', 'cast', 'prop', 'location')),
  description text not null default '',
  -- Once the operator hand-edits the description, the design agent may PROPOSE
  -- a rewrite but must never apply one (decision Q8).
  description_owned_by_operator boolean not null default false,
  -- The one detail that must survive every frame (Bo's star tee).
  identity_anchor text,
  species_or_type text,
  notes text,
  -- Drafts ARE usable in videos, but badged (decision Q6).
  status text not null default 'draft' check (status in ('draft', 'locked')),
  -- Bumped on every relock; pinned onto videos so edits are forward-only (Q5).
  version int not null default 1,
  created_at timestamptz not null default now(),
  locked_at timestamptz
);
create index if not exists characters_name_idx on characters (lower(name));

-- ── Styles: PROJECT-scoped, several per project ─────────────────────────────
create table if not exists styles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  style_string text not null default '',
  palette jsonb not null default '{}'::jsonb,
  composition_rules text,
  exclusions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists styles_project_idx on styles (project_id);
-- At most one default style per project.
create unique index if not exists styles_one_default_per_project
  on styles (project_id) where is_default;

-- ── Character looks: identity × style → the actual reference images ─────────
create table if not exists character_looks (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  style_id uuid not null references styles(id) on delete cascade,
  -- 'portrait' is the chest-up front-facing framing avatar models want; an
  -- illustration reference crops badly for talking-head shots (Q2).
  look_type text not null default 'illustration'
    check (look_type in ('illustration', 'portrait')),
  canonical_image_path text,
  sheet_image_path text,
  extra_ref_paths text[] not null default '{}',
  -- Set when the parent style_string changes: the look still injects (it was
  -- correct under the old string) but offers one-click regeneration. Never
  -- auto-regenerate — that spends money without asking (Q4).
  stale boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'locked')),
  version int not null default 1,
  locked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists character_looks_unique
  on character_looks (character_id, style_id, look_type);

-- ── Which global characters a project uses ──────────────────────────────────
create table if not exists project_characters (
  project_id uuid not null references projects(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  primary key (project_id, character_id)
);

-- ── The Character Studio chat thread (replayable, like workspace_messages) ──
create table if not exists character_design_messages (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  role text not null check (role in ('user', 'agent', 'system')),
  content text not null,
  intent jsonb,
  candidate_asset_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists character_design_messages_idx
  on character_design_messages (character_id, created_at);

-- ── Video-level wiring ──────────────────────────────────────────────────────
-- Which style this video renders in; null → the project's default style.
alter table videos add column if not exists style_id uuid references styles(id);
-- {character_id: version} stamped at generation time so a later character edit
-- never rewrites the past (Q5).
alter table videos add column if not exists character_versions jsonb not null default '{}'::jsonb;

-- ── RLS (single-operator shape, matching the rest of the schema) ────────────
alter table characters enable row level security;
alter table styles enable row level security;
alter table character_looks enable row level security;
alter table project_characters enable row level security;
alter table character_design_messages enable row level security;

drop policy if exists characters_all on characters;
create policy characters_all on characters for all to authenticated using (true) with check (true);
drop policy if exists styles_all on styles;
create policy styles_all on styles for all to authenticated using (true) with check (true);
drop policy if exists character_looks_all on character_looks;
create policy character_looks_all on character_looks for all to authenticated using (true) with check (true);
drop policy if exists project_characters_all on project_characters;
create policy project_characters_all on project_characters for all to authenticated using (true) with check (true);
drop policy if exists character_design_messages_all on character_design_messages;
create policy character_design_messages_all on character_design_messages for all to authenticated using (true) with check (true);
