-- Exemplar library (agent-training build, Step 2): proven-winner references
-- mined from niche research / video intel, plus the project's own top
-- performers (Step 4 auto-promotion). Injected into generation prompts as
-- few-shot exemplars — the "extensively trained agents" data substrate.

create table if not exists exemplars (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  -- 'mined' = external winner from research; 'own' = this channel's own
  -- top-performing video (auto-promoted by the outcome loop).
  origin text not null check (origin in ('mined', 'own')),
  source jsonb not null default '{}'::jsonb, -- {videoId,title,channel,views,subs,ratio}
  hook text,                                  -- verbatim/reconstructed opening hook
  structure jsonb not null default '{}'::jsonb, -- {beats:[{label,seconds}],pacing,visualStyle}
  title_pattern text,                         -- what makes the title work
  notes text,                                 -- distilled "why it wins"
  score numeric,                              -- outlier/performance score for ranking
  mined_at timestamptz not null default now()
);
create index if not exists exemplars_project_idx on exemplars (project_id, score desc);
create unique index if not exists exemplars_source_uniq
  on exemplars (project_id, origin, ((source->>'videoId')));

alter table exemplars enable row level security;
drop policy if exists exemplars_all on exemplars;
create policy exemplars_all on exemplars for all to authenticated using (true) with check (true);
