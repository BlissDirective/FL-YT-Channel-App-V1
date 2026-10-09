-- Format library (operator decision 2026-10-09, AI Influencer playbook).
-- One row per winning short-form video found in research. Each row holds
--   the CAPTURE record  — link, platform, creator, stats, date: proof it won;
--   the PERSUASION record — hook word for word, a second-by-second beat map,
--     the product moment and WHY it worked: the reusable part.
-- Formats are concept-level templates: a script is written FROM the beat map
-- for our own character; source footage is never reused.
create table if not exists formats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  niche text not null default '',
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube', 'facebook', 'x', 'other')),
  source_url text not null,
  -- Normalized link (host + path, no query): scrapers return duplicates, so
  -- the same video recorded twice updates one row.
  source_key text not null,
  source text not null default 'manual' check (source in ('manual', 'apify', 'scrape_creators', 'other')),
  creator text,
  posted_at timestamptz,
  -- {views, likes, shares, comments, saves} as captured.
  stats jsonb not null default '{}'::jsonb,
  title text,
  hook text,
  -- [{at, beat, onScreen?, audio?}] — seconds from the start of the video.
  beat_map jsonb not null default '[]'::jsonb,
  product_moment text,
  why_it_works text,
  duration_sec numeric,
  tags text[] not null default '{}',
  status text not null default 'candidate' check (status in ('candidate', 'approved', 'retired')),
  used_count int not null default 0,
  last_used_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists formats_source_key on formats (source_key);
create index if not exists formats_niche_idx on formats (lower(niche));

-- Which format a video was made from; hook-first approval time.
alter table videos add column if not exists format_id uuid references formats(id) on delete set null;
alter table videos add column if not exists hook_approved_at timestamptz;

alter table formats enable row level security;
drop policy if exists formats_all on formats;
create policy formats_all on formats for all to authenticated using (true) with check (true);
