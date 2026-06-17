-- Kinetic Highlights — opt-in, Claude-curated, burned-in attention text.
-- A sparse set of bold animated on-screen moments (a shocking stat, a key
-- quote, a punchy hook) rendered over the existing visuals. Distinct from the
-- always-on word-window captions: "less is more", ~1 per 30–60s.
--
-- Stored on `videos` (not `scripts`) so it survives the many script-version
-- inserts (beat edits, remixes) without per-site carry-forward, and rides
-- along with the render-queue's `select("*")` on videos.

alter table videos
  add column if not exists enable_highlights boolean not null default false;

-- Operator-set target count. 0 = auto density (renderer/curator picks ~1 per 45s).
alter table videos
  add column if not exists highlight_count int not null default 0;

-- Curated highlights (review-time shape, no timestamps — those are resolved at
-- render time from per-beat word timings):
--   [{ id, beatIdx, text, emphasisWord, stylePreset, fontFamily,
--      emphasisColor, position, intensity, maxLines }]
alter table videos
  add column if not exists highlights jsonb not null default '[]';
