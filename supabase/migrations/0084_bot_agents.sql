-- Channel bot operators (docs/bots/README.md). One Grok bot per channel drives
-- the studio through studio-mcp with its OWN bearer token, scoped server-side
-- to its project, a monthly Higgsfield cap, and a tool allowlist (no publish,
-- no gate approvals, no other channels). The director (Claude, control token)
-- reviews bots daily, curates their lessons, and updates their playbooks here
-- — guidance reaches a bot on its next get_bot_brief, no redeploy.
-- Additive + idempotent.

create table if not exists bot_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_id uuid not null references projects(id) on delete cascade,
  token_hash text not null unique,           -- sha256 hex of the bearer token
  monthly_cap_usd numeric not null default 600,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists bot_agents_project_idx on bot_agents (project_id);

-- Living guidance: shared operating rules / lessons (project_id null) and each
-- channel's playbook. Versioned by overwrite + updated_at (git holds history).
create table if not exists bot_playbooks (
  id uuid primary key default gen_random_uuid(),
  key text not null,                         -- 'operating-rules' | 'lessons-learned' | 'playbook' | 'director-notes'
  project_id uuid references projects(id) on delete cascade,
  content text not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'director'
);
create unique index if not exists bot_playbooks_key_project
  on bot_playbooks (key, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- The continuous-learning log. Bots propose; the director adopts / retires.
create table if not exists bot_lessons (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  video_id uuid references videos(id) on delete set null,
  author text not null default 'bot',        -- 'bot' | 'director'
  kind text not null default 'quality',      -- quality | spend | hook | pacing | audio | visual | research | process
  lesson text not null,
  evidence text,
  status text not null default 'proposed',   -- proposed | adopted | retired
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists bot_lessons_project_idx on bot_lessons (project_id, status, created_at desc);

-- Viral research notes (what was studied, what it implies), with sources.
create table if not exists bot_research (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  video_id uuid references videos(id) on delete set null,
  query text not null,
  findings text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bot_research_project_idx on bot_research (project_id, created_at desc);

-- Service-role only (studio-mcp uses the service key); no anon/auth access.
alter table bot_agents enable row level security;
alter table bot_playbooks enable row level security;
alter table bot_lessons enable row level security;
alter table bot_research enable row level security;

-- Which bot created a video (null = operator/director). Enforces one-video-
-- at-a-time and learn-before-next for that bot.
alter table videos add column if not exists bot_agent_id uuid references bot_agents(id) on delete set null;
create index if not exists videos_bot_agent_idx on videos (bot_agent_id) where bot_agent_id is not null;
